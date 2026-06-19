import * as fs from 'fs'

// GH-148: synchronous streaming line iterator for JSONL transcripts.
//
// Replaces `fs.readFileSync(path, 'utf-8').split(/\r?\n/)` at the 6 session
// read points so a multi-MB transcript never materialises as one giant string +
// one giant array. Peak memory becomes ~one chunk + the current line.
//
// SYNCHRONOUS BY DESIGN: the whole session-parse chain (6 parsers →
// AssetFileCache.read → buildSessionDetail/Replay → CLI) is synchronous, and the
// caches are synchronous. An async readline iterator would force the entire chain
// + caches async. So this uses fs.openSync + readSync, not readline.
//
// BYTE-EXACT EQUIVALENCE TO split(/\r?\n/) — verified against Node semantics:
//   "".split            → [""]               (empty file = one empty line)
//   "a\nb".split        → ["a","b"]          (no trailing newline = last partial line)
//   "a\nb\n".split      → ["a","b",""]       (trailing newline = trailing empty line)
//   "a\r\nb".split      → ["a","b"]          (\r adjacent to \n is consumed)
//   "a\rb".split        → ["a\rb"]           (lone \r NOT before \n stays)
//   "a\r\r\nb".split    → ["a\r","b"]        (only the ONE \r touching \n is dropped)
//   "a\r".split         → ["a\r"]            (trailing \r with no \n stays)
// Emission rule below reproduces every case: split on 0x0A; for a segment that
// preceded a \n, drop exactly one trailing 0x0D if present; the final segment
// (after the last \n / whole input when no \n) is emitted verbatim. Always emit
// at least one line (the empty-file case).

const CHUNK_SIZE = 64 * 1024
const LF = 0x0a
const CR = 0x0d

/** Decode one line's bytes, dropping a single trailing \r iff it preceded a \n. */
function decodeLine(buf: Buffer, precededByNewline: boolean): string {
  if (precededByNewline && buf.length > 0 && buf[buf.length - 1] === CR) {
    return buf.subarray(0, buf.length - 1).toString('utf-8')
  }
  return buf.toString('utf-8')
}

/**
 * Yield each JSONL line with its 0-based line index, byte-for-byte equivalent to
 * `readFileSync(path,'utf-8').split(/\r?\n/)` with `entries()`. Empty lines DO
 * occupy an index (so replay event ids `L{index}B{n}` stay aligned with the old
 * split-based indices). Throws on open/read failure — callers wrap in try/catch
 * and the generator runs inside that try, so partially-read lines are still
 * yielded before the throw (non all-or-nothing on truncation/locks).
 */
export function* iterateJsonlLinesWithIndex(filePath: string): Generator<{ index: number; line: string }> {
  const fd = fs.openSync(filePath, 'r')
  try {
    const readBuf = Buffer.allocUnsafe(CHUNK_SIZE)
    // Bytes of the current (not-yet-terminated) line, stitched across chunks so a
    // UTF-8 multibyte char split over a chunk boundary is never decoded mid-byte.
    let pending: Buffer = Buffer.alloc(0)
    let index = 0
    let sawAnyByte = false

    for (;;) {
      const bytesRead = fs.readSync(fd, readBuf, 0, CHUNK_SIZE, null)
      if (bytesRead === 0) break
      sawAnyByte = true
      let start = 0
      for (let i = 0; i < bytesRead; i++) {
        if (readBuf[i] !== LF) continue
        // Line = pending + readBuf[start..i) (excluding the \n itself).
        const segment = readBuf.subarray(start, i)
        const lineBuf = pending.length > 0 ? Buffer.concat([pending, segment]) : segment
        yield { index, line: decodeLine(lineBuf, true) }
        index++
        pending = Buffer.alloc(0)
        start = i + 1
      }
      // Carry the tail (after the last \n in this chunk) into pending. Copy it —
      // readBuf is reused on the next readSync.
      if (start < bytesRead) {
        const tail = readBuf.subarray(start, bytesRead)
        pending = pending.length > 0 ? Buffer.concat([pending, tail]) : Buffer.from(tail)
      }
    }

    // Final segment after the last \n (or the whole input when it had no \n).
    // split always yields a trailing element here — including the empty string
    // for an empty file ("".split(/\r?\n/) === [""]) and the trailing empty line
    // after a final newline. The final segment is emitted verbatim (no \r drop):
    // "a\r".split === ["a\r"].
    if (!sawAnyByte) {
      yield { index, line: '' }
      return
    }
    yield { index, line: pending.toString('utf-8') }
  } finally {
    fs.closeSync(fd)
  }
}

/** Yield each JSONL line (no index), byte-for-byte equivalent to split(/\r?\n/). */
export function* iterateJsonlLines(filePath: string): Generator<string> {
  for (const { line } of iterateJsonlLinesWithIndex(filePath)) {
    yield line
  }
}

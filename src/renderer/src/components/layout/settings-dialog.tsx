import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@/components/ui'
import { SettingsContent } from '@/components/settings/settings-content'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Kept for API compatibility. HeroUI Modal (React Aria) restores focus to the
   * trigger automatically on close, so this is no longer consumed.
   */
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <Modal
      isOpen={open}
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      hideCloseButton
      aria-label={t('settings.title')}
      classNames={{
        base: 'titlebar-no-drag max-h-[calc(100vh-4rem)]',
        wrapper: 'titlebar-no-drag'
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {/* Close button lives OUTSIDE ModalHeader: React Aria derives the
                dialog's accessible name from aria-labelledby → ModalHeader, so a
                button inside it would pollute the name ("Settings Close"). */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              radius="md"
              onPress={onClose}
              aria-label={t('common.close')}
              title={t('common.close')}
              className="absolute right-3 top-3 z-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
            <ModalHeader className="border-b border-border pr-12">
              <span className="text-base font-semibold">{t('settings.title')}</span>
            </ModalHeader>
            <ModalBody className="px-5 py-5">
              <SettingsContent showTitle={false} className="max-w-none" />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

'use client'

import { useId } from 'react'
import { Toggle } from '@/features/demo/ui/screens/_shared'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import {
  ENCRYPTION_STRENGTH_OPTIONS,
  PROMPT_MODE_OPTIONS,
  type ZipEncryptionStrength,
  type ZipPromptMode,
} from '@/features/demo/engine/content/settings-values'
import {
  PaneDescription,
  PaneGroup,
  PaneNote,
  PaneRadioGroup,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Phone testids (`ExportSecuritySection.tsx:49,55,60` and `:204,245`).
 *
 * Keyed by the closed union, not `string` (R-11): a `Record<string, string>` lookup returns
 * `string` for anything, so a renamed or added strength would have handed `undefined` to a
 * `testID` prop and silently dropped the hook a side-by-side parity pass addresses the row by.
 * Total records make that a compile error at the table instead.
 */
const STRENGTH_TESTIDS: Record<ZipEncryptionStrength, string> = {
  'AES-256': 'export-security-strength-aes256',
  'AES-128': 'export-security-strength-aes128',
  STANDARD: 'export-security-strength-standard',
}
const PROMPT_TESTIDS: Record<ZipPromptMode, string> = {
  auto: 'export-security-prompt-auto',
  always_prompt: 'export-security-prompt-always',
}

/**
 * Detail pane: **Export Security** (matrix row 91; phone `ExportSecuritySection.tsx`).
 *
 * The pane's real conditional behaviour IS ported and fires for real: the Export Mode /
 * Encryption Strength / Default Password / warning block appears only while at least ONE of the
 * two switches is on (`ExportSecuritySection.tsx:191`), which is the phone's own "the two
 * switches are independent and share one password, mode, and strength" architecture.
 *
 * **No password input.** The phone's inline form is deliberately not replicated. Decision D4
 * already skipped `PasswordModal`, and nothing the demo produces is encrypted — the ZIP
 * pipelines terminate in an honest notice (`exportNotices.ts`) and the two real PDF saves go
 * through the browser's own print path. A password field in a surface that stores nothing would
 * invite a visitor to type a real secret into a demo, which is a worse outcome than a missing
 * control. The status line and the Set-password affordance still render, inert, so the pane's
 * shape is intact and the reason is on screen beside them.
 */
export function ExportSecurityPane({ settings, onChange }: SettingsPaneProps) {
  const anyEncryption = settings.zipEncryptionEnabled || settings.singleFileEncryptionEnabled
  // R-6 — the inert Set-password button's reason, which is the note already beneath it.
  const passwordReasonId = `${useId()}-password-reason`

  return (
    <div data-testid="settings-pane-export-security">
      <PaneStubNote>
        Nothing the demo produces is encrypted: the ZIP pipelines end in an honest &ldquo;no
        download here&rdquo; notice, and the two documents that are real — the Case Notes and the
        Time-Offset Calibration reports — are saved through your browser&apos;s own print dialog.
        So there is no archive to protect and no secret to keep, and the demo asks for no
        password anywhere. On the phone these switches drive AES encryption of the exported
        evidence.
      </PaneStubNote>

      <PaneDescription>
        Password-protect exported evidence for secure handling. The two switches are independent
        and share one password, mode, and strength.
      </PaneDescription>

      <div style={{ marginBottom: 16 }}>
        <Toggle
          label="Encrypt ZIP exports (case, location)"
          on={settings.zipEncryptionEnabled}
          onClick={() => onChange({ zipEncryptionEnabled: !settings.zipEncryptionEnabled })}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <Toggle
          label="Encrypt single-file shares (GeoJSON, Map, reports)"
          on={settings.singleFileEncryptionEnabled}
          onClick={() => onChange({ singleFileEncryptionEnabled: !settings.singleFileEncryptionEnabled })}
        />
      </div>

      {anyEncryption && (
        <div data-testid="export-security-shared-config">
          <PaneGroup label="Export Mode" help="Choose how passwords are handled during export.">
            <PaneRadioGroup
              label="Export Mode"
              options={PROMPT_MODE_OPTIONS}
              value={settings.promptMode}
              onChange={(promptMode) => onChange({ promptMode })}
              testIdOf={(v) => PROMPT_TESTIDS[v]}
            />
          </PaneGroup>

          <PaneGroup
            label="Encryption Strength"
            help="AES requires 7-Zip or WinRAR to open the ZIP on Windows. Standard (ZipCrypto) is weak and provided only for legacy compatibility."
          >
            <PaneRadioGroup
              label="Encryption Strength"
              options={ENCRYPTION_STRENGTH_OPTIONS}
              value={settings.encryptionStrength}
              onChange={(encryptionStrength) => onChange({ encryptionStrength })}
              testIdOf={(v) => STRENGTH_TESTIDS[v]}
            />
          </PaneGroup>

          <PaneGroup label="Default Password">
            <div data-testid="export-security-password-status" style={{ fontSize: 13, color: '#99badd' }}>
              No default password set
            </div>
            <button
              type="button"
              // Inert, and focusable on purpose (the house `aria-disabled`-over-`disabled`
              // rule): a keyboard visitor reaches it and hears the reason from the note below.
              aria-disabled="true"
              aria-describedby={passwordReasonId}
              data-testid="export-security-set-password"
              onClick={() => {
                /* inert — the demo stores no password; see the note below */
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                padding: '10px 14px',
                borderRadius: 10,
                border: GLASS.borderBtn,
                background: 'transparent',
                color: '#7a9fc4',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              Set Default Password
            </button>
            <PaneNote tone="info" id={passwordReasonId}>
              The demo has nowhere to keep a password and nothing to unlock with it, so it never
              asks for one. On the phone this writes to the device keychain — never to the
              database, and never into an export.
            </PaneNote>
          </PaneGroup>

          <PaneNote tone="warning">
            Password cannot be recovered. If you forget the password, the exported ZIP cannot be
            opened.
          </PaneNote>
        </div>
      )}
    </div>
  )
}

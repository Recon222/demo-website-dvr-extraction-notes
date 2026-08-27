// Authored preview — ExportInfoScreen. Export media/file-type details + media-player toggle.
// Variant axis: filled details w/ player included vs. blank + toggle off.
import { ExportInfoScreen } from 'open-pro-next'

/* Form customisation (Settings > Form Fields) can hide any wizard field; a screen asks this
   predicate per field id. Every preview shows the DEFAULT state — nothing hidden. */
const allFieldsVisible = () => true

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Filled() {
  return (
    <Phone>
      <ExportInfoScreen
        isFieldVisible={allFieldsVisible}
        data={{
          exportMedia: 'USB Drive',
          fileType: 'Proprietary',
          sizeGb: '12',
          mediaPlayerIncluded: true,
          mediaProvidedVia: 'Hand Delivered',
        }}
        onChange={() => {}}
        onToggleMediaPlayer={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}

export function Empty() {
  return (
    <Phone>
      <ExportInfoScreen
        isFieldVisible={allFieldsVisible}
        data={{ exportMedia: '', fileType: '', sizeGb: '', mediaPlayerIncluded: false, mediaProvidedVia: '' }}
        onChange={() => {}}
        onToggleMediaPlayer={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}

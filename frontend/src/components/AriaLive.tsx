/**
 * AriaLive — renders two visually-hidden live regions:
 *   - polite: for success/info messages (proposals loaded, vote submitted)
 *   - assertive: for errors
 *
 * Usage:
 *   <AriaLive polite={infoMessage} assertive={errorMessage} />
 */
interface Props {
  polite?: string;
  assertive?: string;
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function AriaLive({ polite, assertive }: Props) {
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" style={srOnly}>
        {polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" style={srOnly}>
        {assertive}
      </div>
    </>
  );
}

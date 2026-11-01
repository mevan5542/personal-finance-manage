export default function SettingsPanel({
  user,
  appearance,
  onChange,
  storageError,
}) {
  return (
    <div className="settings-grid">
      <section className="preview-card">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>Appearance</h2>
        <p className="muted">
          Preferences are remembered for this account in this browser.
        </p>
        <fieldset className="setting-group">
          <legend>Display mode</legend>
          <div className="choice-grid">
            {[
              ["light", "Light", "A bright, calm workspace"],
              ["dark", "Dark", "A softer view after hours"],
              ["system", "System", "Follow your device"],
            ].map(([value, label, description]) => (
              <label
                className={`setting-choice ${appearance.mode === value ? "selected" : ""}`}
                key={value}
              >
                <input
                  type="radio"
                  name="display-mode"
                  value={value}
                  checked={appearance.mode === value}
                  onChange={() => onChange({ ...appearance, mode: value })}
                />
                <strong>{label}</strong>
                <small>{description}</small>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="setting-group">
          <legend>Accent colour</legend>
          <div className="accent-choices">
            {[
              ["forest", "Forest"],
              ["ocean", "Ocean"],
              ["plum", "Plum"],
            ].map(([value, label]) => (
              <label
                className={`accent-choice ${value} ${appearance.accent === value ? "selected" : ""}`}
                key={value}
              >
                <input
                  type="radio"
                  name="accent-colour"
                  value={value}
                  checked={appearance.accent === value}
                  onChange={() => onChange({ ...appearance, accent: value })}
                />
                <span className="accent-dot" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {storageError && <p role="alert">{storageError}</p>}
      </section>
      <section className="preview-card">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h2>Profile</h2>
        <dl className="transaction-detail-list">
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Currency</dt>
          <dd>Sri Lankan Rupee · LKR</dd>
          <dt>Record storage</dt>
          <dd>Your application’s MongoDB database</dd>
        </dl>
        <p className="muted small-note">
          Changing the appearance does not change your transactions, documents
          or budgets.
        </p>
      </section>
    </div>
  );
}

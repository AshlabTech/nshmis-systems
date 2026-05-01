export default function Modal({ config, onClose }) {
  if (!config) return null;

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <h3>{config.title}</h3>
            {config.subtitle && <p className="muted">{config.subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        {config.content}
      </div>
    </div>
  );
}

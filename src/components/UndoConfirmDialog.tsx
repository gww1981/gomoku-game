interface UndoConfirmDialogProps {
  onAccept: () => void
  onReject: () => void
}

export function UndoConfirmDialog({ onAccept, onReject }: UndoConfirmDialogProps) {
  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        <p>对手请求悔棋</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn accept" onClick={onAccept}>同意</button>
          <button type="button" className="dialog-btn reject" onClick={onReject}>拒绝</button>
        </div>
      </div>
    </div>
  )
}

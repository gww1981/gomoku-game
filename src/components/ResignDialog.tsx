interface ResignDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ResignDialog({ onConfirm, onCancel }: ResignDialogProps) {
  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        <p>确定认输吗？</p>
        <p className="dialog-hint">此操作不可撤销</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn reject" onClick={onConfirm}>认输</button>
          <button type="button" className="dialog-btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}

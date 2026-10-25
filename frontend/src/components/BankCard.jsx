import { groupCardNumber, maskCardNumber } from "../lib/cardNumbers";
import "./bank-card.css";

function BankCard({ variant, network, label, number, holder, expiry, revealed, frozen }) {
  return (
    <div className={`bank-card ${variant} ${frozen ? "frozen" : ""}`}>
      <div className="bank-card-top">
        <div className="bank-card-brand">
          <strong>AUREUS</strong>
          <span>{label}</span>
        </div>
        <span className="contactless" aria-hidden>)))</span>
      </div>

      <div className="chip" aria-hidden>
        <i /><i /><i />
      </div>

      <div className="bank-card-number">{revealed ? groupCardNumber(number) : maskCardNumber(number)}</div>

      <div className="bank-card-bottom">
        <div>
          <small>Card holder</small>
          <span>{holder.toUpperCase()}</span>
        </div>
        <div>
          <small>Expires</small>
          <span>{expiry}</span>
        </div>
        {network === "visa" ? (
          <div className="network visa">VISA</div>
        ) : (
          <div className="network mastercard" aria-label="Mastercard">
            <i /><i />
          </div>
        )}
      </div>
      {frozen && <div className="frozen-badge">❄ Frozen</div>}
    </div>
  );
}

export default BankCard;

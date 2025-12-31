import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/#reset",
    });

    if (error) setError(error.message);
    else setSent(true);
  };

  if (sent)
    return <p>📧 Нууц үг солих линк таны email рүү илгээгдлээ!</p>;

  return (
    <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>Нууц үг мартсан уу?</h3>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
      />
      <button 
        onClick={handleSend}
        style={{ width: "100%", padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
      >
        Нууц үг сэргээх
      </button>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
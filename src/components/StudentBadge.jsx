import React from "react";

const StudentBadge = ({ student, showText = false, showDate = false }) => {
  if (!student) {
    return (
      <div className="flex items-center gap-2 opacity-50">
        <div className="w-2.5 h-2.5 rounded-full bg-ebony-border" />
        {showText && <span className="text-[10px] text-gray-500 uppercase">-</span>}
      </div>
    );
  }

  const hasPlan = !!student.finPlanName || !!student.planName || !!student.planId;

  const rawDue =
    student.finDueDate ||
    student.finDueDateInMonth ||
    student.dueDate ||
    student.nextDueDate ||
    student.vencimento ||
    null;

  const dueDateISO = typeof rawDue === "string"
    ? rawDue.slice(0, 10)
    : rawDue?.toDate
      ? rawDue.toDate().toISOString().slice(0, 10)
      : null;

  let formattedDate = null;
  if (dueDateISO) {
    formattedDate = dueDateISO.split('-').reverse().join('/');
  }

  // ✅ STATUS RECOMPUTADO EM TEMPO REAL (corrige o stale do Firestore)
  const computeLiveStatus = () => {
    const storedStatus = student.finStatus || null;

    if (storedStatus === "Pausado") return "Pausado";
    if (storedStatus === "Pago e não iniciado") return "Pago e não iniciado";
    if (!dueDateISO) return storedStatus;

    const today = new Date();
    const z = n => ('0' + n).slice(-2);
    const todayISO = `${today.getFullYear()}-${z(today.getMonth() + 1)}-${z(today.getDate())}`;

    if (dueDateISO < todayISO) {
      const [y, m, d] = dueDateISO.split('-').map(Number);
      const limit = new Date(y, m - 1, d);
      limit.setDate(limit.getDate() + 30);
      const limitISO = `${limit.getFullYear()}-${z(limit.getMonth() + 1)}-${z(limit.getDate())}`;
      return todayISO > limitISO ? "Não renovou" : "Vencido";
    }

    const [y, m, d] = dueDateISO.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 ? "Renova" : "Ativo";
  };

  const finStatus = computeLiveStatus();

  // --- MAPEAMENTO DE CORES ---
  let colorClass = "bg-gray-600 border border-gray-500/30";
  let label = "Sem plano";

  if (finStatus === "Pausado") {
    colorClass = "bg-gray-500 border border-gray-400/30";
    label = "Pausado";
  } else if (!hasPlan) {
    colorClass = "bg-gray-700 border border-gray-600/30";
    label = "Sem plano";
  } else if (finStatus === "Não renovou") {
    colorClass = "bg-red-900 border border-red-500/30 text-red-500 shadow-neon-red";
    label = "Não renovou";
  } else if (finStatus === "Vencido") {
    colorClass = "bg-[#850000] border border-red-500/50 shadow-neon-red";
    label = "Vencido";
  } else if (finStatus === "Renova") {
    colorClass = "bg-amber-600 border border-amber-500/30 shadow-neon-amber";
    label = "Renova";
  } else if (finStatus === "Pago e não iniciado") {
    colorClass = "bg-yellow-500 border border-yellow-400/30 shadow-neon-amber";
    label = "Pago/Não iniciou";
  } else if (finStatus === "Ativo") {
    colorClass = "bg-emerald-500 border border-emerald-400/30 shadow-neon-green";
    label = "Ativo";
  } else if (!formattedDate) {
    colorClass = "bg-slate-600";
    label = "Sem venc.";
  } else {
    colorClass = "bg-emerald-500 border border-emerald-400/30 shadow-neon-green";
    label = "Ativo";
  }

  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2" title={formattedDate ? `Vence em: ${formattedDate}` : label}>
        <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
        {showText && (
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
            {label}
          </span>
        )}
      </div>
      {showDate && formattedDate && (
        <span className="text-[10px] text-gray-500 mt-0.5 ml-0.5 font-mono">
          {formattedDate}
        </span>
      )}
    </div>
  );
};

export default StudentBadge;
interface Props {
  income: number;
  expense: number;
  balance: number;
}

function format(amount: number) {
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

export default function AccountingKPIs({
  income,
  expense,
  balance,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Balance */}
      <div className="bg-white border rounded-xl p-6">
        <p className="text-sm text-gray-500">
          Balance Total
        </p>
        <p className="text-2xl font-bold">
          {format(balance)}
        </p>
      </div>

      {/* Ingresos */}
      <div className="bg-white border rounded-xl p-6">
        <p className="text-sm text-gray-500">
          Ingresos Totales
        </p>
        <p className="text-2xl font-bold text-green-600">
          {format(income)}
        </p>
      </div>

      {/* Gastos */}
      <div className="bg-white border rounded-xl p-6">
        <p className="text-sm text-gray-500">
          Gastos Totales
        </p>
        <p className="text-2xl font-bold text-red-600">
          {format(expense)}
        </p>
      </div>
    </div>
  );
}

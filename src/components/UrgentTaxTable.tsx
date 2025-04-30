import React from "react";

interface Tax {
  taxId: number;
  type: number;
  amount: string;
  paymentDeadline: string;
  daysLeft: number;
}

interface Props {
  taxes: Tax[];
}

const UrgentTaxTable: React.FC<Props> = ({ taxes }) => {
  return (
    <div className="table-responsive">
      <table className="table custom-table">
        <tbody>
          <tr className="table custom-header">
            <td>Imposto</td>
            <td>Montante</td>
            <td>Data limite</td>
            <td></td>
          </tr>
          {taxes.map((tax) => (
            <tr key={tax.taxId}>
              <td>{tax.type}</td>
              <td>{tax.amount}</td>
              <td>{tax.paymentDeadline}</td>
              <td>
                <i className="fas fa-clock"></i>&nbsp;
                <span className="text-muted font-weight-semibold">
                  {tax.daysLeft} dias até expirar
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UrgentTaxTable;

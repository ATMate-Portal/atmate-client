import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

const Home: React.FC = () => {
  return (
    <div className="accordion-container">
      <div className="accordion w-100 mx-auto" id="mainAccordion">
        {/* Primeiro Item */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="headingOne">
            <button
              className="accordion-button"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapseOne"
              aria-expanded="true"
              aria-controls="collapseOne"
            >
              CTT
            </button>
          </h2>
          <div
            id="collapseOne"
            className="accordion-collapse collapse show"
            aria-labelledby="headingOne"
            data-bs-parent="#mainAccordion"
          >
            <div className="accordion-body">
              <TableComponent />
            </div>
          </div>
        </div>

        {/* Segundo Item */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="headingTwo">
            <button
              className="accordion-button collapsed"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapseTwo"
              aria-expanded="false"
              aria-controls="collapseTwo"
            >
              CRITICAL
            </button>
          </h2>
          <div
            id="collapseTwo"
            className="accordion-collapse collapse"
            aria-labelledby="headingTwo"
            data-bs-parent="#mainAccordion"
          >
            <div className="accordion-body">
              <TableComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TableComponent: React.FC = () => {
  return (
    <div className="table-responsive">
      <table className="table custom-table">
        <tbody>
          <tr>
            <td>IRS</td>
            <td>500€</td>
            <td>20/03/2025</td>
            <td>
              <i className="fas fa-clock"></i>
              <span className="text-muted font-weight-semibold"> 35 dias até expirar</span>
            </td>
          </tr>
          <tr>
            <td>IVA</td>
            <td>300€</td>
            <td>15/04/2025</td>
            <td>
              <i className="fas fa-clock"></i>
              <span className="text-muted font-weight-semibold"> 54 dias até expirar</span>
            </td>
          </tr>
          <tr>
            <td>IMI</td>
            <td>700€</td>
            <td>10/05/2025</td>
            <td> 
                <i className="fas fa-clock"></i>
                <span className="text-muted font-weight-semibold"> 75 dias até expirar</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Home;

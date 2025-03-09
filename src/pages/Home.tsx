import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

const Home: React.FC = () => {

  return (
    <div className="container"> {/* Adicionei um container para centralizar */}
    <div className="accordion-container">
      <div className="accordion w-100 mx-auto" id="mainAccordion">
        
        {/* Primeiro Item */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="headingOne">
            <button
              className="accordion-button fs-4 d-flex justify-content-between align-items-center"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapseOne"
              aria-expanded="true"
              aria-controls="collapseOne"
            >
              <div className="d-flex align-items-center w-100 justify-content-between"> {/* Envolvendo tudo em um div */}
                <div className="d-flex align-items-center">
                  <span className="fs-4">🚨</span>
                  <span className="ms-4 fs-3">Softinsa</span>
                </div>
                <span className="text-muted me-5">4 dias até expirar</span>
              </div>
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
        {/* FIM Primeiro Item */}
        {/* Segundo Item */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="headingOne">
            <button
              className="accordion-button fs-4"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapseTwo"
              aria-expanded="true"
              aria-controls="collapseTwo"
            >
              

              <div className="d-flex align-items-center w-100 justify-content-between"> {/* Envolvendo tudo em um div */}
                <div className="d-flex align-items-center">
                  <span className="fs-4">⚠️</span>
                  <span className="ms-4 fs-3">NTT Data</span>
                </div>
                <span className="text-muted me-5">10 dias até expirar</span>
              </div>
            </button>
          </h2>
          
          <div
            id="collapseTwo"
            className="accordion-collapse collapse show"
            aria-labelledby="headingOne"
            data-bs-parent="#mainAccordion"
          >
            <div className="accordion-body">
              <TableComponent />
            </div>
          </div>
        </div>
        {/* FIM Segundo Item */}
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
        <tr className="table custom-header">
          <td>Imposto</td>
          <td>Montante</td>
          <td>Data limite</td>
          <td></td>
        </tr>
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

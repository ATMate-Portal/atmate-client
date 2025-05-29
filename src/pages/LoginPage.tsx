// src/pages/LoginPage/LoginPage.tsx
import React, { useState, FormEvent, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './LoginPage.css';
import { AuthContext } from '../api/AuthContext'; 

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  const FULL_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/';

  // Salvaguarda caso o AuthContext ainda não esteja disponível
  if (!authContext) {
    // Isto não deve acontecer se AuthProvider estiver a envolver a aplicação corretamente.
    console.error("AuthContext não está disponível. Verifica se AuthProvider está a envolver a tua aplicação.");
    return <div>Erro: Contexto de Autenticação não encontrado.</div>;
  }

  const { login: contextLogin } = authContext;

  const validateEmail = (emailToValidate: string): boolean => {
    if (!emailToValidate) {
      setEmailError('O email é obrigatório.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      setEmailError('Por favor, insira um email válido.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (passwordToValidate: string): boolean => {
    if (!passwordToValidate) {
      setPasswordError('A password é obrigatória.');
      return false;
    }
    if (passwordToValidate.length < 8) {
      setPasswordError('A password deve ter pelo menos 8 caracteres.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setPasswordError('');
    setLoginError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      // Substitui '/api/auth/login' pelo teu endpoint real da API
      const response = await fetch(`${FULL_API_BASE_URL}atmate-gateway/auth/login`, { // <<< USA CRASES AQUI
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Falha no login (Status: ${response.status})`);
      }

      const { token, user } = data; // Ajusta conforme a tua API

      if (!token) {
        throw new Error('Token não recebido da API.');
      }

      // Usar a função login do AuthContext
      contextLogin(token, user);

      console.log('Login bem-sucedido, token e utilizador passados para AuthContext.');
      navigate('/'); // Navegar para a raiz, que o router.tsx deve direcionar para /home se autenticado

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setLoginError(errorMessage);
      console.error('Erro no login:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper animate-fade-in">
        <div className="login-header">
          <img src="/logo_azul.svg" alt="ATMate Logo" className="login-logo" />
        </div>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateEmail(email)}
              disabled={isLoading}
              aria-describedby="email-error"
              aria-invalid={!!emailError}
              className={emailError ? 'input-error' : ''}
              autoComplete="email"
            />
            {emailError && <p id="email-error" className="error-message field-error">{emailError}</p>}
          </div>

          <div className="form-group password-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => validatePassword(password)}
                disabled={isLoading}
                aria-describedby="password-error"
                aria-invalid={!!passwordError}
                className={passwordError ? 'input-error' : ''}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                title={showPassword ? "Ocultar password" : "Mostrar password"}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {passwordError && <p id="password-error" className="error-message field-error">{passwordError}</p>}
          </div>

          {loginError && <p className="error-message api-error">{loginError}</p>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" /> A processar...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
        <div className="login-links">
          <a href="/forgot-password">Esqueceu-se da password?</a>
        </div>
        <footer className="login-footer">
          <p>&copy; {new Date().getFullYear()} ATMate. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
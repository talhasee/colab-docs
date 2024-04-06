// Register.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // eslint-disable-next-line
      const response = await axios.post('http://localhost:3001/api/user/register', { email, password }, { withCredentials: true });
      // console.log(response.data.data); 
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed');
    }
  };

  const toLogin = () => {
    navigate('/login')
  };

  return (
    <div className="register-container">
      <h1>Register</h1>
      {error && <div>{error}</div>}
      <form onSubmit={handleRegister}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className='regsiter' type="submit">Register</button>
      </form>
      <button className='register-login' onClick={toLogin} type="submit">Log In</button>
    </div>
);

};

export default Register;

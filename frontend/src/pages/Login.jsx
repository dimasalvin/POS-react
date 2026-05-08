import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data.token, res.data.user);
      toast.success(`Selamat datang, ${res.data.user.nama}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-700 to-teal-900">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-teal-800">Apotek Moro Mari</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Manajemen Farmasi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Masukkan username"
            autoFocus
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Masukkan password"
          />
          <Button type="submit" loading={loading} className="w-full">
            Masuk
          </Button>
        </form>


      </div>
    </div>
  );
}

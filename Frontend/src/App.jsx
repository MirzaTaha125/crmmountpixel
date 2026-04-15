import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './SignIn';
import AdminPanel from './AdminPanel';
import UserPanel from './UserPanel';
import ClientPanel from './ClientPanel';
import Register from './Register';
import ClientPaymentLink from './ClientPaymentLink';
import { useSession } from './session';

function HomeRedirect() {
  const { user } = useSession();
  if (!user) return <Navigate to="/signin" />;
  if (user.Role === 'Admin') return <Navigate to="/admin" />;
  if (user.type === 'Client') return <Navigate to="/client" />;
  return <Navigate to="/user" />;
}

function App() {
  const { user } = useSession();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/admin" element={user?.Role === 'Admin' ? <AdminPanel /> : <Navigate to="/signin" />} />
        <Route path="/user" element={user && user.Role !== 'Admin' ? <UserPanel /> : <Navigate to="/signin" />} />
        <Route path="/client" element={user && user.type === 'Client' ? <ClientPanel /> : <Navigate to="/signin" />} />
        <Route path="/pay/:paymentId" element={<ClientPaymentLink />} />
        <Route path="*" element={<Navigate to="/signin" />} />
      </Routes>
    </Router>
  );
}

export default App;

// scripts/auth.js

// Nota: Usamos matricula como password para simplificar el frontend.
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

function registerUser(username, matricula, grupo, email, role) {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.find(u => u.matricula === matricula)) {
        alert("La matrícula ya está registrada.");
        return false;
    }
    const newUser = { username, matricula, grupo, email, role, id: Date.now() };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return true;
}

function loginUser(matricula) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.matricula === matricula);

    // Lógica especial para el Doctor (Doctor's profile is always 'doc123')
    if (matricula === 'doc123') {
        let doctor = users.find(u => u.role === 'doctor');
        if (!doctor) {
             // Si el doctor no existe, lo registramos la primera vez
             registerUser('Dr. Experto', 'doc123', 'N/A', 'doctor@espectro.edu', 'doctor');
             doctor = users.find(u => u.role === 'doctor');
        }
        localStorage.setItem('currentUser', JSON.stringify(doctor));
        return true;
    }
    
    if (user && user.role === 'alumno') {
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
    }
    return false;
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function checkAuth(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    if (requiredRole && user.role !== requiredRole) {
        alert("Acceso denegado.");
        window.location.href = 'dashboard.html';
        return null;
    }
    return user;
}
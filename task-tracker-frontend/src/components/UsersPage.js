import React, { useState } from 'react';

function UsersPage({ users, roles, userProfile, handleUpdate, handleDelete, handleCreate, fetchUsers }) {
    const initialNewUserState = { username: '', email: '', role_id: '' };
    const [newUser, setNewUser] = useState(initialNewUserState);
    const [editingUser, setEditingUser] = useState(null);
    const [userMessage, setUserMessage] = useState('');
    const [userError, setUserError] = useState('');
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [showUsersList, setShowUsersList] = useState(true);

    const handleNewUserChange = (e) => {
        setNewUser(prevState => ({ ...prevState, [e.target.name]: e.target.value }));
    };

    const handleNewUserSubmit = (e) => {
        e.preventDefault();
        handleCreate('/users/', { ...newUser, role_id: newUser.role_id ? parseInt(newUser.role_id, 10) : null }, 'User created!', setNewUser, initialNewUserState, fetchUsers, setShowNewUserForm, setUserMessage, setUserError);
    };

    const handleUpdateUserSubmit = (e, user) => {
        e.preventDefault();
        handleUpdate('/users', user.id, editingUser, 'User updated!', fetchUsers, setUserMessage, setUserError);
        setEditingUser(null);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">User Management</h2>
            {userProfile && userProfile.roleName === 'Admin' && (<button onClick={() => setShowNewUserForm(!showNewUserForm)} className="mb-4 mr-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">{showNewUserForm ? 'Hide Form' : 'Add New User'}</button>)}
            <button onClick={() => setShowUsersList(!showUsersList)} className="mb-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">{showUsersList ? 'Hide List' : 'Show List'}</button>
            {showNewUserForm && userProfile && userProfile.roleName === 'Admin' && (<form onSubmit={handleNewUserSubmit} className="space-y-4 mt-4">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New User</h3>
              <label className="block"><span className="text-gray-700 font-medium">Username:</span><input type="text" name="username" value={newUser.username} onChange={handleNewUserChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5"/></label>
              <label className="block"><span className="text-gray-700 font-medium">Email:</span><input type="email" name="email" value={newUser.email} onChange={handleNewUserChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5"/></label>
              <label className="block"><span className="text-gray-700 font-medium">Role:</span><select name="role_id" value={newUser.role_id} onChange={handleNewUserChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5"><option value="">Select a Role</option>{roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></label>
              <div className="flex justify-end space-x-2"><button type="submit" className="bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700">Add User</button><button type="button" onClick={() => setShowNewUserForm(false)} className="bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600">Cancel</button></div>
              {userMessage && <div className="text-green-600 mt-2">{userMessage}</div>}
              {userError && <div className="text-red-600 mt-2">{userError}</div>}
            </form>)}
            {showUsersList && (<div className="mt-6"><h3 className="text-xl font-semibold text-gray-800 mb-4">Users List</h3>{users.length === 0 ? <p className="text-gray-600 italic">No users found.</p> : <ul className="space-y-4">{users.map(user => (
                <li key={user.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm">
                  {editingUser && editingUser.id === user.id ? (
                    <form onSubmit={(e) => handleUpdateUserSubmit(e, user)} className="space-y-2">
                      <label className="block"><span className="text-gray-700 text-sm font-medium">Username:</span><input type="text" name="username" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"/></label>
                      <label className="block"><span className="text-gray-700 text-sm font-medium">Email:</span><input type="email" name="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"/></label>
                      <label className="block"><span className="text-gray-700 text-sm font-medium">Role:</span><select name="role_id" value={editingUser.role_id || ''} onChange={(e) => setEditingUser({ ...editingUser, role_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"><option value="">Select a Role</option>{roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></label>
                      <div className="flex justify-end space-x-2 mt-3"><button type="submit" className="bg-green-600 text-white py-1.5 px-3 rounded-md text-sm hover:bg-green-700">Save</button><button type="button" onClick={() => setEditingUser(null)} className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-gray-600">Cancel</button></div>
                    </form>
                  ) : (
                    <>
                      <strong className="text-xl text-blue-700 block mb-1">{user.username}</strong> (ID: {user.id})
                      <p className="text-gray-700 text-sm mb-1">Email: {user.email}</p>
                      <p className="text-gray-700 text-xs mb-2">Role: {user.role_id ? (roles.find(r => r.id === user.role_id)?.name || user.role_id) : 'N/A'}</p>
                      <div className="flex space-x-2 mt-2">{userProfile && userProfile.roleName === 'Admin' && (<><button onClick={() => setEditingUser(user)} className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-yellow-600">Edit</button><button onClick={() => handleDelete('/users', user.id, 'User deleted!', fetchUsers)} className="bg-red-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-red-600">Delete</button></>)}</div>
                    </>
                  )}
                </li>
            ))}</ul>}</div>)}
        </div>
    );
}

export default UsersPage;

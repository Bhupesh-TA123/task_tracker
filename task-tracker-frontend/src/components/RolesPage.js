import React, { useState } from 'react';

function RolesPage({ roles, userProfile, handleUpdate, handleDelete, handleCreate, fetchRoles }) {
    const initialNewRoleState = { name: '' };
    const [newRole, setNewRole] = useState(initialNewRoleState);
    const [editingRole, setEditingRole] = useState(null);
    const [roleMessage, setRoleMessage] = useState('');
    const [roleError, setRoleError] = useState('');
    const [showNewRoleForm, setShowNewRoleForm] = useState(false);
    const [showRolesList, setShowRolesList] = useState(true);

    const handleNewRoleChange = (e) => {
        setNewRole({ ...newRole, [e.target.name]: e.target.value });
    };

    const handleNewRoleSubmit = (e) => {
        e.preventDefault();
        handleCreate('/roles/', newRole, 'Role created!', setNewRole, initialNewRoleState, fetchRoles, setShowNewRoleForm, setRoleMessage, setRoleError);
    };

    const handleUpdateRoleSubmit = (e, role) => {
        e.preventDefault();
        handleUpdate('/roles', role.id, editingRole, 'Role updated!', fetchRoles, setRoleMessage, setRoleError);
        setEditingRole(null);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">Role Management</h2>
            {userProfile && userProfile.roleName === 'Admin' && (<button onClick={() => setShowNewRoleForm(!showNewRoleForm)} className="mb-4 mr-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">{showNewRoleForm ? 'Hide Form' : 'Add New Role'}</button>)}
            <button onClick={() => setShowRolesList(!showRolesList)} className="mb-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">{showRolesList ? 'Hide List' : 'Show List'}</button>
            {showNewRoleForm && userProfile && userProfile.roleName === 'Admin' && (<form onSubmit={handleNewRoleSubmit} className="space-y-4 mt-4">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New Role</h3>
              <label className="block"><span className="text-gray-700 font-medium">Name:</span><input type="text" name="name" value={newRole.name} onChange={handleNewRoleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5"/></label>
              <div className="flex justify-end space-x-2"><button type="submit" className="bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700">Add Role</button><button type="button" onClick={() => setShowNewRoleForm(false)} className="bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600">Cancel</button></div>
              {roleMessage && <div className="text-green-600 mt-2">{roleMessage}</div>}
              {roleError && <div className="text-red-600 mt-2">{roleError}</div>}
            </form>)}
            {showRolesList && (<div className="mt-6"><h3 className="text-xl font-semibold text-gray-800 mb-4">Roles List</h3>{roles.length === 0 ? <p className="text-gray-600 italic">No roles found.</p> : <ul className="space-y-4">{roles.map(role => (
                <li key={role.id} className="border p-4 rounded-lg bg-gray-50 shadow-sm">
                  {editingRole && editingRole.id === role.id ? (
                    <form onSubmit={(e) => handleUpdateRoleSubmit(e, role)} className="space-y-2">
                      <label className="block"><span className="text-gray-700 text-sm font-medium">Name:</span><input type="text" name="name" value={editingRole.name} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm" /></label>
                      <div className="flex justify-end space-x-2 mt-3"><button type="submit" className="bg-green-600 text-white py-1.5 px-3 rounded-md text-sm hover:bg-green-700">Save</button><button type="button" onClick={() => setEditingRole(null)} className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-gray-600">Cancel</button></div>
                    </form>
                  ) : (
                    <>
                      <strong className="text-xl text-blue-700 block mb-1">{role.name}</strong> (ID: {role.id})
                      <div className="flex space-x-2 mt-2">
                        {userProfile && userProfile.roleName === 'Admin' && (<><button onClick={() => setEditingRole(role)} className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-yellow-600">Edit</button><button onClick={() => handleDelete('/roles', role.id, 'Role deleted!', fetchRoles)} className="bg-red-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-red-600">Delete</button></>)}
                      </div>
                    </>
                  )}
                </li>
            ))}</ul>}</div>)}
        </div>
    );
}

export default RolesPage;

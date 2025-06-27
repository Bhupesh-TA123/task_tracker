import React, { useState } from 'react';

// --- Sub-component for the Project Edit Form ---
const EditProjectForm = ({ project, users, onSave, onCancel }) => {
    const [editedProject, setEditedProject] = useState(project);
    
    // --- NEW: Filter for Admin users for the edit form as well ---
    const adminUsers = users.filter(user => user.roleName === 'Admin');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedProject(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editedProject);
    };

    return (
        <tr className="bg-yellow-50">
            <td colSpan="7" className="p-4">
                <form onSubmit={handleSubmit}>
                    <h4 className="font-bold mb-2">Editing: {project.name}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <input type="text" name="name" value={editedProject.name} onChange={handleInputChange} className="p-2 border rounded" placeholder="Name" />
                        <select name="owner_id" value={editedProject.owner_id || ''} onChange={handleInputChange} className="p-2 border rounded">
                            <option value="">Select an Admin Owner</option>
                            {/* Use the filtered adminUsers list here */}
                            {adminUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                        <input type="date" name="start_date" value={editedProject.start_date || ''} onChange={handleInputChange} className="p-2 border rounded"/>
                        <input type="date" name="end_date" value={editedProject.end_date || ''} onChange={handleInputChange} className="p-2 border rounded"/>
                    </div>
                    <textarea name="description" value={editedProject.description || ''} onChange={handleInputChange} className="w-full p-2 border rounded mb-2" placeholder="Description" />
                    <div className="flex justify-end space-x-2">
                        <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cancel</button>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md">Save Changes</button>
                    </div>
                </form>
            </td>
        </tr>
    );
};


// --- Sub-component for displaying a single project row ---
const ProjectRow = ({ project, users, tasks, userProfile, handleUpdate, handleDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [expanded, setExpanded] = useState(false);
    
    const associatedTasks = tasks.filter(task => task.project_id === project.id);
    const findOwnerName = (ownerId) => users.find(u => u.id === ownerId)?.username || 'N/A';
    
    const handleSave = (updatedProject) => {
        handleUpdate('/projects', updatedProject.id, updatedProject, 'Project updated!');
        setIsEditing(false);
    };

    if (isEditing) {
        return <EditProjectForm project={project} users={users} onSave={handleSave} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <>
            <tr className="bg-white hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 break-words max-w-xs">{project.description || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{findOwnerName(project.owner_id)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.start_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.end_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{associatedTasks.length}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setExpanded(!expanded)} className="text-indigo-600 hover:text-indigo-900 mr-4">{expanded ? 'Hide Tasks' : 'Show Tasks'}</button>
                    {userProfile.roleName === 'Admin' && (
                        <>
                            <button onClick={() => setIsEditing(true)} className="text-yellow-600 hover:text-yellow-900 mr-4">Edit</button>
                            <button onClick={() => handleDelete('/projects', project.id, 'Project deleted!')} className="text-red-600 hover:text-red-900">Delete</button>
                        </>
                    )}
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan="7" className="p-4 bg-gray-50">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Tasks for {project.name}</h4>
                        {associatedTasks.length > 0 ? (
                            <ul className="space-y-2">
                                {associatedTasks.map(task => (
                                    <li key={task.id} className="text-sm text-gray-600 p-2 bg-white rounded-md border">
                                        {task.description} - <strong>Status:</strong> {task.status} - <strong>Owner:</strong> {findOwnerName(task.owner_id)}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500 italic">No tasks for this project.</p>}
                    </td>
                </tr>
            )}
        </>
    );
};


// --- Main Page Component ---
const ProjectsPage = ({ projects, tasks, users, userProfile, handleUpdate, handleDelete, handleCreate, fetchProjects }) => {
    const initialNewProjectState = { name: '', description: '', start_date: '', end_date: '', owner_id: '' };
    const [newProject, setNewProject] = useState(initialNewProjectState);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [formError, setFormError] = useState('');
    const [listMessage, setListMessage] = useState('');
    const [listError, setListError] = useState('');
    
    // --- NEW: Filter for users with the 'Admin' role ---
    const adminUsers = users.filter(user => user.roleName === 'Admin');
    
    const handleNewProjectSubmit = (e) => {
        e.preventDefault();
        const projectData = { ...newProject, owner_id: newProject.owner_id ? parseInt(newProject.owner_id, 10) : null };
        handleCreate('/projects/', projectData, 'Project created!', setNewProject, initialNewProjectState, fetchProjects, setShowCreateForm, setFormMessage, setFormError);
    };
    
    const updateProject = (endpoint, id, data, msg) => handleUpdate(endpoint, id, data, msg, fetchProjects, setListMessage, setListError);
    const deleteProject = (endpoint, id, msg) => handleDelete(endpoint, id, msg, fetchProjects, setListMessage, setListError);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
                    {userProfile.roleName === 'Admin' && (
                        <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                            {showCreateForm ? 'Cancel' : '＋ Create New Project'}
                        </button>
                    )}
                </div>
                {showCreateForm && (
                     <form onSubmit={handleNewProjectSubmit} className="space-y-4 mt-4 border-t pt-6">
                        <h3 className="text-xl font-semibold">New Project Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="name" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" required className="p-2.5 border rounded-md"/>
                            
                            {/* --- MODIFIED: This dropdown now only shows Admin users --- */}
                            <select name="owner_id" value={newProject.owner_id} onChange={e => setNewProject({...newProject, owner_id: e.target.value})} required className="p-2.5 border rounded-md">
                                <option value="">Select an Admin Owner</option>
                                {adminUsers.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
                            </select>

                            <input type="date" name="start_date" value={newProject.start_date} onChange={e => setNewProject({...newProject, start_date: e.target.value})} required className="p-2.5 border rounded-md"/>
                            <input type="date" name="end_date" value={newProject.end_date} onChange={e => setNewProject({...newProject, end_date: e.target.value})} required className="p-2.5 border rounded-md"/>
                        </div>
                        <textarea name="description" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} placeholder="Description" required rows="3" className="w-full p-2.5 border rounded-md"></textarea>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700">Add Project</button>
                        {formMessage && <p className="text-green-600 mt-2">{formMessage}</p>}
                        {formError && <p className="text-red-600 mt-2">{formError}</p>}
                    </form>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Projects List</h3>
                {listMessage && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{listMessage}</div>}
                {listError && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{listError}</div>}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map(project => 
                                <ProjectRow 
                                    key={project.id} 
                                    project={project}
                                    users={users}
                                    tasks={tasks}
                                    userProfile={userProfile}
                                    handleUpdate={updateProject}
                                    handleDelete={deleteProject}
                                />
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProjectsPage;
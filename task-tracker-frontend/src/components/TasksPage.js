// src/components/TasksPage.js

import React, { useState } from 'react';

const TASK_STATUSES = [
  { value: 'not started', label: 'Not Started' },
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

function TasksPage({ tasks, projects, users, userProfile, handleUpdate, handleDelete, handleCreate, handleMarkTaskComplete, fetchTasks }) {
    const initialNewTaskState = { description: '', due_date: '', status: TASK_STATUSES[0].value, owner_id: '', project_id: '' };
    const [newTask, setNewTask] = useState(initialNewTaskState);
    const [editingTask, setEditingTask] = useState(null);
    const [taskMessage, setTaskMessage] = useState('');
    const [taskError, setTaskError] = useState('');
    const [showNewTaskForm, setShowNewTaskForm] = useState(false);

    const readOnlyUsers = users.filter(user => user.roleName === 'Read Only');

    const handleNewTaskChange = (e) => {
        setNewTask(prevState => ({ ...prevState, [e.target.name]: e.target.value }));
    };

    const handleNewTaskSubmit = (e) => {
        e.preventDefault();
        const taskData = { 
            ...newTask, 
            owner_id: newTask.owner_id ? parseInt(newTask.owner_id, 10) : null,
            project_id: newTask.project_id ? parseInt(newTask.project_id, 10) : null
        };
        handleCreate('/tasks/', taskData, 'Task created!', setNewTask, initialNewTaskState, fetchTasks, setShowNewTaskForm, setTaskMessage, setTaskError);
    };

    const handleUpdateTaskSubmit = (e) => {
        e.preventDefault();
        const taskData = { 
            ...editingTask, 
            owner_id: editingTask.owner_id ? parseInt(editingTask.owner_id, 10) : null,
            project_id: editingTask.project_id ? parseInt(editingTask.project_id, 10) : null
        };
        handleUpdate('/tasks', editingTask.id, taskData, 'Task updated!', fetchTasks, setTaskMessage, setTaskError);
        setEditingTask(null); // Exit edit mode after submission
    };

    const findOwnerName = (ownerId) => users.find(u => u.id === ownerId)?.username || 'N/A';
    const findProjectName = (projectId) => projects.find(p => p.id === projectId)?.name || 'N/A';
    
    const startEditing = (task) => {
        setEditingTask({
            ...task,
            due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">Task Management</h2>
            {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator') && (
                <button onClick={() => setShowNewTaskForm(!showNewTaskForm)} className="mb-4 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700">
                    {showNewTaskForm ? 'Hide Form' : '＋ Add New Task'}
                </button>
            )}
            
            {showNewTaskForm && (
                <form onSubmit={handleNewTaskSubmit} className="space-y-4 mt-4 border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New Task</h3>
                    <label className="block"><span className="text-gray-700 font-medium">Description:</span><textarea name="description" value={newTask.description} onChange={handleNewTaskChange} required rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5"></textarea></label>
                    <label className="block"><span className="text-gray-700 font-medium">Due Date:</span><input type="date" name="due_date" value={newTask.due_date} onChange={handleNewTaskChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5"/></label>
                    <label className="block"><span className="text-gray-700 font-medium">Status:</span><select name="status" value={newTask.status} onChange={handleNewTaskChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5">{TASK_STATUSES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></label>
                    <label className="block"><span className="text-gray-700 font-medium">Assign to (Owner):</span>
                        <select name="owner_id" value={newTask.owner_id} onChange={handleNewTaskChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5">
                            <option value="">Select a Read Only User</option>
                            {readOnlyUsers.map(user => (<option key={user.id} value={user.id}>{user.username}</option>))}
                        </select>
                    </label>
                    <label className="block"><span className="text-gray-700 font-medium">Project:</span>
                        <select name="project_id" value={newTask.project_id} onChange={handleNewTaskChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5">
                            <option value="">Select a Project</option>
                            {projects.map(project => (<option key={project.id} value={project.id}>{project.name}</option>))}
                        </select>
                    </label>
                    <div className="flex justify-end space-x-2">
                        <button type="submit" className="bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700">Add Task</button>
                        <button type="button" onClick={() => setShowNewTaskForm(false)} className="bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                    {taskMessage && <div className="text-green-600 mt-2">{taskMessage}</div>}
                    {taskError && <div className="text-red-600 mt-2">{taskError}</div>}
                </form>
            )}

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">All Tasks List</h3>
              {tasks.length === 0 ? <p className="text-gray-600 italic">No tasks found.</p> : <ul className="space-y-4">{tasks.map(task => (
                  <li key={task.id} className="border p-4 rounded-lg bg-gray-50 shadow-sm">
                    {editingTask && editingTask.id === task.id ? (
                      
                      // --- THIS IS THE COMPLETE AND CORRECT EDITING FORM ---
                      <form onSubmit={handleUpdateTaskSubmit} className="space-y-2 text-sm">
                        <h4 className="font-bold text-base mb-2">Editing Task:</h4>
                        <label className="block"><span className="text-gray-700 font-medium">Description:</span>
                          <textarea name="description" value={editingTask.description} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} rows="2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm" required></textarea>
                        </label>
                        <label className="block"><span className="text-gray-700 font-medium">Due Date:</span>
                          <input type="date" name="due_date" value={editingTask.due_date} onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm" required/>
                        </label>
                        <label className="block"><span className="text-gray-700 font-medium">Status:</span>
                          <select name="status" value={editingTask.status} onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm">
                            {TASK_STATUSES.map(statusOption => (<option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>))}
                          </select>
                        </label>
                        <label className="block"><span className="text-gray-700 font-medium">Owner:</span>
                            <select name="owner_id" value={editingTask.owner_id || ''} onChange={(e) => setEditingTask({ ...editingTask, owner_id: e.target.value })} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm">
                                <option value="">Select a Read Only User</option>
                                {readOnlyUsers.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
                            </select>
                        </label>
                        <label className="block"><span className="text-gray-700 font-medium">Project:</span>
                             <select name="project_id" value={editingTask.project_id || ''} onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value })} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm">
                                <option value="">Select Project</option>
                                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                            </select>
                        </label>
                        <div className="flex justify-end space-x-2 mt-3">
                            <button type="submit" className="bg-green-600 text-white py-1.5 px-3 rounded-md text-xs hover:bg-green-700">Save</button>
                            <button type="button" onClick={() => setEditingTask(null)} className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-gray-600">Cancel</button>
                        </div>
                      </form>
                      // --- END OF EDITING FORM ---

                    ) : (
                      <>
                        <strong className="text-base text-gray-800">{task.description}</strong>
                        <p className="text-gray-600 text-xs">Due: {task.due_date || 'N/A'} | Status: {task.status || 'N/A'} | Project: {findProjectName(task.project_id)}</p>
                        <p className="text-gray-600 text-xs">Owner: {findOwnerName(task.owner_id)}</p>
                        <div className="flex space-x-2 mt-2">
                          {userProfile && task.status !== 'completed' && (<button onClick={() => handleMarkTaskComplete(task)} className="bg-green-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-green-600">Mark Complete</button>)}
                          {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator') && (<button onClick={() => startEditing(task)} className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-yellow-600">Edit</button>)}
                          {userProfile && (userProfile.roleName === 'Admin') && (<button onClick={() => handleDelete('/tasks', task.id, 'Task deleted!', fetchTasks)} className="bg-red-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-red-600">Delete</button>)}
                        </div>
                      </>
                    )}
                  </li>
              ))}</ul>}
            </div>
        </div>
    );
}

export default TasksPage;
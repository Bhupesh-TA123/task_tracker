import React, { useState, useEffect } from 'react';
import Login from './Login'; // Import the new Login component

// Base URL for your Flask API
const API_BASE_URL = 'http://127.0.0.1:5000';

// Define task statuses
const TASK_STATUSES = [
  { value: 'not started', label: 'Not Started' },
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Stores user data including role
  const [loadingAuth, setLoadingAuth] = useState(true); // To show loading while checking auth

  // State variables for managing data
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [roles, setRoles] = useState([]); // State to store roles

  // Initial state definitions for form resets
  const initialNewProjectState = { name: '', description: '', start_date: '', end_date: '', owner_id: '' };
  const initialNewUserState = { username: '', email: '', role_id: '' };
  const initialNewTaskState = { description: '', due_date: '', status: TASK_STATUSES[0].value, owner_id: '', project_id: '' };
  const initialNewRoleState = { name: '' };

  // State variables for new item forms
  const [newProject, setNewProject] = useState(initialNewProjectState);
  const [newUser, setNewUser] = useState(initialNewUserState);
  const [newTask, setNewTask] = useState(initialNewTaskState);
  const [newRole, setNewRole] = useState(initialNewRoleState);

  // Local state for messages and errors for each section/form
  const [projectMessage, setProjectMessage] = useState('');
  const [projectError, setProjectError] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [userError, setUserError] = useState('');
  const [taskMessage, setTaskMessage] = useState('');
  const [taskError, setTaskError] = useState('');
  const [roleMessage, setRoleMessage] = useState('');
  const [roleError, setRoleError] = useState('');
  const [globalMessage, setGlobalMessage] = useState(''); // For general success/error like delete
  const [globalError, setGlobalError] = useState(''); // For general success/error like delete


  // State for editing existing items
  const [editingProject, setEditingProject] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingRole, setEditingRole] = useState(null);

  // State for controlling form and list visibility
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [showRolesList, setShowRolesList] = useState(false);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);

  // New state for current page/view
  const [currentPage, setCurrentPage] = useState('projects'); // Default page


  // --- Authentication Check on Component Mount ---
  useEffect(() => {
    const token = localStorage.getItem('app_token');
    const storedUser = localStorage.getItem('user_profile');

    if (token && storedUser) {
      setIsLoggedIn(true);
      setUserProfile(JSON.parse(storedUser));
      setLoadingAuth(false);
      // If logged in, fetch all data
      fetchData('/projects/', setProjects);
      fetchData('/users/', setUsers);
      fetchData('/tasks/', setTasks);
      fetchData('/roles/', setRoles);
    } else {
      setIsLoggedIn(false);
      setLoadingAuth(false);
    }
  }, []);

  // --- Utility to get Authorization Headers ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('app_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }) // Add Authorization header if token exists
    };
  };

  // --- Utility Functions for API Calls ---
  const fetchData = async (endpoint, setter) => {
    setGlobalError(''); // Clear global error before fetching
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: getAuthHeaders(), // Include auth header for fetches
      });
      if (response.status === 401) { // Only redirect to login for 401 Unauthorized
        handleLogout();
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setter(data);
    } catch (err) {
      setGlobalError(`Failed to fetch ${endpoint.substring(1)}: ${err.message}. Make sure your Flask backend is running and accessible.`);
      console.error(`Error fetching ${endpoint.substring(1)}:`, err);
    }
  };

  // Utility to clear messages after a delay
  const clearMessages = (setMsg, setErr) => {
    setTimeout(() => {
      setMsg('');
      setErr('');
    }, 5000); // Messages disappear after 5 seconds
  };

  const createItem = async (endpoint, itemData, successMsg, formSetter, initialFormState, fetcher, hideFormSetter = null, localSetMessage, localSetError) => {
    localSetMessage('');
    localSetError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(), // Include auth header
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (response.status === 401) { // Redirect to login for 401 Unauthorized
        handleLogout();
        return;
      }
      if (response.status === 403) { // Display error message for 403 Forbidden
        localSetError(data.error || 'Permission denied. You do not have the required role to perform this action.');
        clearMessages(localSetMessage, localSetError);
        return; // Stop execution here
      }
      if (!response.ok) { // Handle other non-2xx errors
        throw new Error(data.error || `Failed to create ${endpoint.substring(1)}`);
      }

      localSetMessage(data.message || successMsg);
      formSetter(initialFormState); // Reset form to its initial empty state
      fetcher(); // Refresh the list
      if (hideFormSetter) {
        hideFormSetter(false); // Hide the form after successful creation
      }
      clearMessages(localSetMessage, localSetError);
    } catch (err) {
      localSetError(`Error creating ${endpoint.substring(1)}: ${err.message}`);
      console.error(`Error creating ${endpoint.substring(1)}:`, err);
      clearMessages(localSetMessage, localSetError);
    }
  };

  const updateItem = async (endpoint, id, itemData, successMsg, fetcher, localSetMessage, localSetError) => {
    localSetMessage('');
    localSetError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(), // Include auth header
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.status === 403) { // Display error message for 403 Forbidden
        localSetError(data.error || 'Permission denied. You do not have the required role to perform this action.');
        clearMessages(localSetMessage, localSetError);
        return; // Stop execution here
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to update ${endpoint.substring(1)}`);
      }

      localSetMessage(data.message || successMsg);
      fetcher(); // Refresh the list
      clearMessages(localSetMessage, localSetError);
    } catch (err) {
      localSetError(`Error updating ${endpoint.substring(1)}: ${err.message}`);
      console.error(`Error updating ${endpoint.substring(1)}:`, err);
      clearMessages(localSetMessage, localSetError);
    }
  };

  const deleteItem = async (endpoint, id, successMsg, fetcher) => {
    setGlobalMessage('');
    setGlobalError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(), // Include auth header
      });

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.status === 403) { // Display global error message for 403 Forbidden
        setGlobalError(data.error || 'Permission denied. You do not have the required role to perform this action.');
        clearMessages(setGlobalMessage, setGlobalError);
        return; // Stop execution here
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to delete ${endpoint.substring(1)}`);
      }

      setGlobalMessage(data.message || successMsg);
      fetcher(); // Refresh the list
      clearMessages(setGlobalMessage, setGlobalError);
    } catch (err) {
      setGlobalError(`Error deleting ${endpoint.substring(1)}: ${err.message}`);
      console.error(`Error deleting ${endpoint.substring(1)}:`, err);
      clearMessages(setGlobalMessage, setGlobalError);
    }
  };

  // --- Logout Function ---
  const handleLogout = () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
    setUserProfile(null);
    window.location.href = '/login'; // Redirect to login page
  };


  // --- Handlers for New Item Forms ---
  const handleNewProjectChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prevState => ({ ...prevState, [name]: value }));
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prevState => ({ ...prevState, [name]: value }));
  };

  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prevState => ({ ...prevState, [name]: value }));
  };

  const handleNewRoleChange = (e) => {
    const { name, value } = e.target;
    setNewRole(prevState => ({ ...prevState, [name]: value }));
  };

  // --- Submission Handlers for New Items ---
  const handleNewProjectSubmit = async (e) => {
    e.preventDefault();
    setProjectMessage('');
    setProjectError('');
    // Basic validation for all required fields in Project
    if (!newProject.name || !newProject.description || !newProject.start_date || !newProject.end_date || !newProject.owner_id) {
        setProjectError('All project fields (Name, Description, Start Date, End Date, Owner ID) are required.');
        clearMessages(setProjectMessage, setProjectError);
        return;
    }
    await createItem(
      '/projects/',
      {
        ...newProject,
        owner_id: parseInt(newProject.owner_id, 10) // owner_id is now always required and parsed
      },
      'Project has been created successfully!', // Updated message
      setNewProject, // Pass the setter
      initialNewProjectState, // Pass initial state for reset
      () => fetchData('/projects/', setProjects),
      null, // No hideFormSetter for project creation
      setProjectMessage, // Pass local message setter
      setProjectError // Pass local error setter
    );
  };

  const handleNewUserSubmit = async (e) => {
    e.preventDefault();
    setUserMessage('');
    setUserError('');
    // Basic validation for required fields
    if (!newUser.username || !newUser.email) {
      setUserError('Username and Email are required for user creation.');
      clearMessages(setUserMessage, setUserError);
      return;
    }
    await createItem(
      '/users/',
      {
        ...newUser,
        role_id: newUser.role_id ? parseInt(newUser.role_id, 10) : null
      },
      'User has been created successfully!',
      setNewUser,
      initialNewUserState, // Pass initial state for reset
      () => fetchData('/users/', setUsers),
      setShowNewUserForm,
      setUserMessage,
      setUserError
    );
  };

  const handleNewTaskSubmit = async (e) => {
    e.preventDefault();
    setTaskMessage('');
    setTaskError('');
    // Basic validation for all required fields in Task
    if (!newTask.description || !newTask.due_date || !newTask.status || !newTask.owner_id || !newTask.project_id) {
        setTaskError('All task fields (Description, Due Date, Status, Owner ID, Project ID) are required.');
        clearMessages(setTaskMessage, setTaskError);
        return;
    }
    await createItem(
      '/tasks/',
      {
        ...newTask,
        owner_id: parseInt(newTask.owner_id, 10),
        project_id: parseInt(newTask.project_id, 10)
      },
      'Task has been created successfully!',
      setNewTask,
      initialNewTaskState, // Pass initial state for reset
      () => fetchData('/tasks/', setTasks),
      setShowNewTaskForm,
      setTaskMessage,
      setTaskError
    );
  };

  const handleNewRoleSubmit = async (e) => {
    e.preventDefault();
    setRoleMessage('');
    setRoleError('');
    if (!newRole.name) {
        setRoleError('Role name is required.');
        clearMessages(setRoleMessage, setRoleError);
        return;
    }
    await createItem(
      '/roles/',
      newRole,
      'Role has been created successfully!',
      setNewRole,
      initialNewRoleState, // Pass initial state for reset
      () => fetchData('/roles/', setRoles),
      setShowNewRoleForm,
      setRoleMessage,
      setRoleError
    );
  };

  // --- Handlers for Update Operations ---
  const handleUpdateProject = async (project) => {
    // Clear previous edit specific messages/errors
    setProjectMessage('');
    setProjectError('');
    await updateItem(
      '/projects',
      project.id,
      {
        ...editingProject,
        owner_id: editingProject.owner_id ? parseInt(editingProject.owner_id, 10) : null
      },
      'Project updated successfully!',
      () => fetchData('/projects/', setProjects),
      setProjectMessage, // Pass local message setter for update
      setProjectError // Pass local error setter for update
    );
    setEditingProject(null); // Exit editing mode
  };

  const handleUpdateUser = async (user) => {
    setUserMessage('');
    setUserError('');
    await updateItem(
      '/users',
      user.id,
      {
        ...editingUser,
        role_id: editingUser.role_id ? parseInt(editingUser.role_id, 10) : null
      },
      'User updated successfully!',
      () => fetchData('/users/', setUsers),
      setUserMessage,
      setUserError
    );
    setEditingUser(null); // Exit editing mode
  };

  const handleUpdateTask = async (task) => {
    setTaskMessage('');
    setTaskError('');
    await updateItem(
      '/tasks',
      task.id,
      {
        ...editingTask,
        owner_id: editingTask.owner_id ? parseInt(editingTask.owner_id, 10) : null,
        project_id: editingTask.project_id ? parseInt(editingTask.project_id, 10) : null
      },
      'Task updated successfully!',
      () => fetchData('/tasks/', setTasks),
      setTaskMessage,
      setTaskError
    );
    setEditingTask(null); // Exit editing mode
  };

  const handleUpdateRole = async (role) => {
    setRoleMessage('');
    setRoleError('');
    await updateItem(
      '/roles',
      role.id,
      editingRole,
      'Role updated successfully!',
      () => fetchData('/roles/', setRoles),
      setRoleMessage,
      setRoleError
    );
    setEditingRole(null); // Exit editing mode
  };

  // --- Handlers for Delete Operations ---
  const handleDeleteProject = async (id) => {
    const userConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <p class="mb-4">Are you sure you want to delete this project? All associated tasks will also be deleted.</p>
          <div class="flex justify-end space-x-2">
            <button id="confirmBtn" class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Yes</button>
            <button id="cancelBtn" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });

    if (userConfirmed) {
      await deleteItem('/projects', id, 'Project deleted successfully!', () => {
        fetchData('/projects/', setProjects);
        fetchData('/tasks/', setTasks); // Refresh tasks as well, since they might be deleted
      });
    }
  };

  const handleDeleteUser = async (id) => {
    const userConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <p class="mb-4">Are you sure you want to delete this user?</p>
          <div class="flex justify-end space-x-2">
            <button id="confirmBtn" class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Yes</button>
            <button id="cancelBtn" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });

    if (userConfirmed) {
      await deleteItem('/users', id, 'User deleted successfully!', () => {
        fetchData('/users/', setUsers);
        fetchData('/projects/', setProjects); // Users can be owners
        fetchData('/tasks/', setTasks); // Users can be task owners
      });
    }
  };

  const handleDeleteTask = async (id) => {
    const userConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <p class="mb-4">Are you sure you want to delete this task?</p>
          <div class="flex justify-end space-x-2">
            <button id="confirmBtn" class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Yes</button>
            <button id="cancelBtn" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });

    if (userConfirmed) {
      await deleteItem('/tasks', id, 'Task deleted successfully!', () => fetchData('/tasks/', setTasks));
    }
  };

  const handleMarkTaskComplete = async (task) => {
    const userConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <p class="mb-4">Are you sure you want to mark this task as "Completed"?</p>
          <div class="flex justify-end space-x-2">
            <button id="confirmBtn" class="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">Yes</button>
            <button id="cancelBtn" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });

    if (userConfirmed) {
      await updateItem(
        '/tasks',
        task.id,
        { ...task, status: 'completed' }, // Update the status to 'completed'
        'Task marked as completed successfully!',
        () => fetchData('/tasks/', setTasks),
        setTaskMessage, // Use local message setter for task specific update
        setTaskError // Use local error setter for task specific update
      );
    }
  };


  const handleDeleteRole = async (id) => {
    const userConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <p class="mb-4">Are you sure you want to delete this role? This might affect users linked to this role.</p>
          <div class="flex justify-end space-x-2">
            <button id="confirmBtn" class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Yes</button>
            <button id="cancelBtn" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });

    if (userConfirmed) {
      await deleteItem('/roles', id, 'Role deleted successfully!', () => {
        fetchData('/roles/', setRoles);
        fetchData('/users/', setUsers); // Users might have their role_id nullified or changed
      });
    }
  };

  // Render Login component if not authenticated or loading
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans antialiased">
        <h2 className="text-2xl font-bold text-gray-800">Loading authentication...</h2>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  // Main application content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans antialiased">
      {/* Tailwind CSS CDN script is in public/index.html */}
      <h1 className="text-4xl font-extrabold text-center text-blue-900 mb-8 rounded-xl p-6 bg-white shadow-xl tracking-wide">
        🚀 Task Tracker Dashboard
      </h1>

      {/* User Profile and Logout */}
      {userProfile && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-lg mb-8">
          <div className="flex items-center space-x-3">
            {userProfile.picture && (
              <img src={userProfile.picture} alt="User" className="w-10 h-10 rounded-full border-2 border-blue-400" />
            )}
            <div>
              <p className="font-semibold text-gray-800">{userProfile.name || userProfile.email}</p>
              <p className="text-sm text-gray-600">Role: {userProfile.roleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md"
          >
            Logout
          </button>
        </div>
      )}


      {/* Navigation for Pages */}
      <nav className="mb-8 p-4 bg-white rounded-xl shadow-lg flex flex-wrap justify-center space-x-2 md:space-x-4">
        <button
          onClick={() => setCurrentPage('projects')}
          className={`min-w-[120px] py-2 px-4 rounded-lg font-bold text-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 mb-2 ${
            currentPage === 'projects' ? 'bg-blue-600 text-white shadow-md ring-blue-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 ring-gray-300'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setCurrentPage('tasks')}
          className={`min-w-[120px] py-2 px-4 rounded-lg font-bold text-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 mb-2 ${
            currentPage === 'tasks' ? 'bg-blue-600 text-white shadow-md ring-blue-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 ring-gray-300'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setCurrentPage('users')}
          className={`min-w-[120px] py-2 px-4 rounded-lg font-bold text-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 mb-2 ${
            currentPage === 'users' ? 'bg-blue-600 text-white shadow-md ring-blue-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 ring-gray-300'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setCurrentPage('roles')}
          className={`min-w-[120px] py-2 px-4 rounded-lg font-bold text-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 mb-2 ${
            currentPage === 'roles' ? 'bg-blue-600 text-white shadow-md ring-blue-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 ring-gray-300'
          }`}
        >
          Roles
        </button>
      </nav>


      {/* Global Message and Error Display for Delete operations (or general fetches) */}
      {globalMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 shadow-md">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline ml-2">{globalMessage}</span>
        </div>
      )}
      {globalError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 shadow-md">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{globalError}</span>
        </div>
      )}

      {/* Conditional Rendering based on currentPage state */}
      {currentPage === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">Create New Project</h2>
            <form onSubmit={handleNewProjectSubmit} className="space-y-4">
              <label className="block">
                <span className="text-gray-700 font-medium">Name:</span>
                <input
                  type="text"
                  name="name"
                  value={newProject.name}
                  onChange={handleNewProjectChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                />
              </label>
              <label className="block">
                <span className="text-gray-700 font-medium">Description:</span>
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={handleNewProjectChange}
                  required
                  rows="3"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                ></textarea>
              </label>
              <label className="block">
                <span className="text-gray-700 font-medium">Start Date:</span>
                <input
                  type="date"
                  name="start_date"
                  value={newProject.start_date}
                  onChange={handleNewProjectChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                />
              </label>
              <label className="block">
                <span className="text-gray-700 font-medium">End Date:</span>
                <input
                  type="date"
                  name="end_date"
                  value={newProject.end_date}
                  onChange={handleNewProjectChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                />
              </label>
              <label className="block">
                <span className="text-gray-700 font-medium">Owner ID:</span>
                <input
                  type="number"
                  name="owner_id"
                  value={newProject.owner_id}
                  onChange={handleNewProjectChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                />
              </label>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:-translate-y-1 shadow-lg"
              >
                Add Project
              </button>
              {/* Project specific messages */}
              {projectMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                  <strong className="font-bold">Success!</strong>
                  <span className="block sm:inline ml-2">{projectMessage}</span>
                </div>
              )}
              {projectError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline ml-2">{projectError}</span>
                </div>
              )}
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">Projects List</h2>
            {projects.length === 0 ? (
              <p className="text-gray-600 italic">No projects found. Create one above!</p>
            ) : (
              <ul className="space-y-6">
                {projects.map(project => (
                  <li key={project.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm transform transition duration-200 hover:scale-[1.01] hover:shadow-md">
                    {editingProject && editingProject.id === project.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleUpdateProject(project); }} className="space-y-3">
                        <label className="block">
                          <span className="text-gray-700 text-sm font-medium">Name:</span>
                          <input
                            type="text"
                            name="name"
                            value={editingProject.name}
                            onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-700 text-sm font-medium">Description:</span>
                          <textarea
                            name="description"
                            value={editingProject.description}
                            onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                            rows="2"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                          ></textarea>
                        </label>
                        <label className="block">
                          <span className="text-gray-700 text-sm font-medium">Start Date:</span>
                          <input
                            type="date"
                            name="start_date"
                            value={editingProject.start_date || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-700 text-sm font-medium">End Date:</span>
                          <input
                            type="date"
                            name="end_date"
                            value={editingProject.end_date || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, end_date: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-700 text-sm font-medium">Owner ID:</span>
                          <input
                            type="number"
                            name="owner_id"
                            value={editingProject.owner_id || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, owner_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                          />
                        </label>
                        <div className="flex justify-end space-x-2 mt-3">
                          <button
                            type="submit"
                            className="bg-green-600 text-white py-1.5 px-4 rounded-md text-sm hover:bg-green-700 transition duration-200 shadow-md"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProject(null)}
                            className="bg-gray-500 text-white py-1.5 px-4 rounded-md text-sm hover:bg-gray-600 transition duration-200 shadow-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <strong className="text-xl text-blue-700 block mb-1">{project.name}</strong> (ID: {project.id})
                        <p className="text-gray-700 text-sm mb-1">Description: {project.description || 'N/A'}</p>
                        <p className="text-gray-700 text-xs mb-1">Start: {project.start_date || 'N/A'} &bull; End: {project.end_date || 'N/A'}</p>
                        <p className="text-gray-700 text-xs mb-2">Owner ID: {project.owner_id || 'N/A'}</p>
                        <div className="flex space-x-2 mt-2">
                          {/* Conditional rendering for buttons based on user role */}
                          {userProfile && (userProfile.roleName === 'Admin') && (
                            <>
                              <button
                                onClick={() => setEditingProject(project)}
                                className="bg-yellow-500 text-white py-1.5 px-4 rounded-md text-sm hover:bg-yellow-600 transition duration-200 shadow-md"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="bg-red-500 text-white py-1.5 px-4 rounded-md text-sm hover:bg-red-600 transition duration-200 shadow-md"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>

                        {/* Tasks for this Project */}
                        <div className="mt-5 border-t border-gray-200 pt-5">
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">Associated Tasks:</h3>
                          {tasks.filter(task => task.project_id === project.id).length === 0 ? (
                            <p className="text-gray-600 text-sm italic">No tasks for this project yet.</p>
                          ) : (
                            <ul className="space-y-3 pl-4 border-l-2 border-gray-200">
                              {tasks
                                .filter(task => task.project_id === project.id)
                                .map(task => (
                                  <li key={task.id} className="bg-gray-100 p-3 rounded-lg shadow-sm">
                                    {editingTask && editingTask.id === task.id ? (
                                      <form onSubmit={(e) => { e.preventDefault(); handleUpdateTask(task); }} className="space-y-1.5 text-sm">
                                        <label className="block">
                                          <span className="text-gray-700">Description:</span>
                                          <textarea
                                            name="description"
                                            value={editingTask.description}
                                            onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                            rows="2"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                                          ></textarea>
                                        </label>
                                        <label className="block">
                                          <span className="text-gray-700">Due Date:</span>
                                          <input
                                            type="date"
                                            name="due_date"
                                            value={editingTask.due_date || ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                                          />
                                        </label>
                                        <label className="block">
                                          <span className="text-gray-700">Status:</span>
                                          <select
                                            name="status"
                                            value={editingTask.status || TASK_STATUSES[0].value}
                                            onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                                          >
                                            {TASK_STATUSES.map(statusOption => (
                                              <option key={statusOption.value} value={statusOption.value}>
                                                {statusOption.label}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="block">
                                          <span className="text-gray-700">Owner ID:</span>
                                          <input
                                            type="number"
                                            name="owner_id"
                                            value={editingTask.owner_id || ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, owner_id: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                                          />
                                        </label>
                                        {/* Project ID is fixed here as it's within a project */}
                                        <div className="flex justify-end space-x-2 mt-3">
                                          <button
                                            type="submit"
                                            className="bg-green-600 text-white py-1.5 px-3 rounded-md text-xs hover:bg-green-700 transition duration-200 shadow-md"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingTask(null)}
                                            className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-gray-600 transition duration-200 shadow-md"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <>
                                        <strong className="text-base text-gray-800">{task.description}</strong> (ID: {task.id})
                                        <p className="text-gray-600 text-xs">Due: {task.due_date || 'N/A'} | Status: {task.status || 'N/A'}</p>
                                        <p className="text-gray-600 text-xs">Owner: {task.owner_id || 'N/A'}</p>
                                        <div className="flex space-x-2 mt-2">
                                          {/* For a Read Only User, only "Mark Complete" might be available */}
                                          {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator' || userProfile.roleName === 'Read Only') && (
                                            <button
                                              onClick={() => handleMarkTaskComplete(task)}
                                              className="bg-blue-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-blue-600 transition duration-200 shadow-md"
                                            >
                                              Mark Complete
                                            </button>
                                          )}
                                          {/* Other buttons (Edit, Delete) would be conditionally rendered based on user role */}
                                          {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator') && (
                                            <>
                                              <button
                                                onClick={() => setEditingTask(task)}
                                                className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-yellow-600 transition duration-200 shadow-md"
                                              >
                                                Edit Task
                                              </button>
                                            </>
                                          )}
                                          {userProfile && (userProfile.roleName === 'Admin') && (
                                            <button
                                              onClick={() => handleDeleteTask(task.id)}
                                              className="bg-red-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-red-600 transition duration-200 shadow-md"
                                            >
                                              Delete Task
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {currentPage === 'tasks' && (
        <>
          {/* Task Creation Section - Now controlled by a button */}
          <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">Task Management</h2>
            {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator') && (
              <button
                onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                className="mb-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md"
              >
                {showNewTaskForm ? 'Hide New Task Form' : 'Add New Task'}
              </button>
            )}


            {showNewTaskForm && userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator') && (
              <form onSubmit={handleNewTaskSubmit} className="space-y-4 mt-4">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New Task</h3>
                <label className="block">
                  <span className="text-gray-700 font-medium">Description:</span>
                  <textarea
                    name="description"
                    value={newTask.description}
                    onChange={handleNewTaskChange}
                    required
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-200 focus:ring-opacity-50 p-2.5"
                  ></textarea>
                </label>
                <label className="block">
                  <span className="text-gray-700 font-medium">Due Date:</span>
                  <input
                    type="date"
                    name="due_date"
                    value={newTask.due_date}
                    onChange={handleNewTaskChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-200 focus:ring-opacity-50 p-2.5"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700 font-medium">Status:</span>
                  <select
                    name="status"
                    value={newTask.status}
                    onChange={handleNewTaskChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-200 focus:ring-opacity-50 p-2.5"
                  >
                    {TASK_STATUSES.map(statusOption => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-gray-700 font-medium">Owner ID:</span>
                  <input
                    type="number"
                    name="owner_id"
                    value={newTask.owner_id}
                    onChange={handleNewTaskChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-200 focus:ring-opacity-50 p-2.5"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700 font-medium">Project ID:</span>
                  <input
                    type="number"
                    name="project_id"
                    value={newTask.project_id}
                    onChange={handleNewTaskChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-200 focus:ring-opacity-50 p-2.5"
                  />
                </label>
                <div className="flex justify-end space-x-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 ease-in-out shadow-md"
                  >
                    Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(false)}
                    className="bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 ease-in-out shadow-md"
                  >
                    Cancel
                  </button>
                </div>
                {/* Task specific messages */}
                {taskMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline ml-2">{taskMessage}</span>
                  </div>
                )}
                {taskError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline ml-2">{taskError}</span>
                  </div>
                )}
              </form>
            )}
            <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">All Tasks List</h3>
              {tasks.length === 0 ? (
                <p className="text-gray-600 italic">No tasks found. Create one above!</p>
              ) : (
                <ul className="space-y-4">
                  {tasks.map(task => (
                    <li key={task.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm transform transition duration-200 hover:scale-[1.01] hover:shadow-md">
                      {editingTask && editingTask.id === task.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateTask(task); }} className="space-y-1.5 text-sm">
                          <label className="block">
                            <span className="text-gray-700">Description:</span>
                            <textarea
                              name="description"
                              value={editingTask.description}
                              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                              rows="2"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                            ></textarea>
                          </label>
                          <label className="block">
                            <span className="text-gray-700">Due Date:</span>
                            <input
                              type="date"
                              name="due_date"
                              value={editingTask.due_date || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-gray-700">Status:</span>
                            <select
                              name="status"
                              value={editingTask.status || TASK_STATUSES[0].value}
                              onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                            >
                              {TASK_STATUSES.map(statusOption => (
                                <option key={statusOption.value} value={statusOption.value}>
                                  {statusOption.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-gray-700">Owner ID:</span>
                            <input
                              type="number"
                              name="owner_id"
                              value={editingTask.owner_id || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, owner_id: e.target.value })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-gray-700">Project ID:</span>
                            <input
                              type="number"
                              name="project_id"
                              value={editingTask.project_id || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                            />
                          </label>
                          <div className="flex justify-end space-x-2 mt-3">
                            <button
                              type="submit"
                              className="bg-green-600 text-white py-1.5 px-3 rounded-md text-xs hover:bg-green-700 transition duration-200 shadow-md"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTask(null)}
                              className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-gray-600 transition duration-200 shadow-md"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <strong className="text-base text-gray-800">{task.description}</strong> (ID: {task.id})
                          <p className="text-gray-600 text-xs">Due: {task.due_date || 'N/A'} | Status: {task.status || 'N/A'} | Project: {task.project_id || 'N/A'}</p>
                          <p className="text-gray-600 text-xs">Owner: {task.owner_id || 'N/A'}</p>
                          <div className="flex space-x-2 mt-2">
                            {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator' || userProfile.roleName === 'Read Only') && (
                              <button
                                onClick={() => handleMarkTaskComplete(task)}
                                className="bg-green-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-green-600 transition duration-200 shadow-md"
                              >
                                Mark Complete
                              </button>
                            )}
                            {userProfile && (userProfile.roleName === 'Admin' || userProfile.roleName === 'Task Creator') && (
                              <button
                                onClick={() => setEditingTask(task)}
                                className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-yellow-600 transition duration-200 shadow-md"
                              >
                                Edit
                              </button>
                            )}
                            {userProfile && (userProfile.roleName === 'Admin') && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="bg-red-500 text-white py-1.5 px-3 rounded-md text-xs hover:bg-red-600 transition duration-200 shadow-md"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {currentPage === 'users' && (
        <>
          {/* Users Section - Now controlled by a button */}
          <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">User Management</h2>
            {userProfile && userProfile.roleName === 'Admin' && (
              <button
                onClick={() => setShowNewUserForm(!showNewUserForm)}
                className="mb-4 mr-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md"
              >
                {showNewUserForm ? 'Hide New User Form' : 'Add New User'}
              </button>
            )}
            <button
              onClick={() => setShowUsersList(!showUsersList)}
              className="mb-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md"
            >
              {showUsersList ? 'Hide Users List' : 'Show Users List'}
            </button>

            {showNewUserForm && userProfile && userProfile.roleName === 'Admin' && (
              <form onSubmit={handleNewUserSubmit} className="space-y-4 mt-4">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New User</h3>
                <label className="block">
                  <span className="text-gray-700 font-medium">Username:</span>
                  <input
                    type="text"
                    name="username"
                    value={newUser.username}
                    onChange={handleNewUserChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700 font-medium">Email:</span>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleNewUserChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-700 font-medium">Role:</span>
                  <select
                    name="role_id"
                    value={newUser.role_id}
                    onChange={handleNewUserChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                  >
                    <option value="">Select a Role (Optional)</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-end space-x-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 ease-in-out shadow-md"
                  >
                    Add User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewUserForm(false)}
                    className="bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 ease-in-out shadow-md"
                  >
                    Cancel
                  </button>
                </div>
                {/* User specific messages */}
                {userMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline ml-2">{userMessage}</span>
                  </div>
                )}
                {userError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline ml-2">{userError}</span>
                  </div>
                )}
              </form>
            )}

            {showUsersList && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Users List</h3>
                {users.length === 0 ? (
                  <p className="text-gray-600 italic">No users found. Create one above!</p>
                ) : (
                  <ul className="space-y-4">
                    {users.map(user => (
                      <li key={user.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm transform transition duration-200 hover:scale-[1.01] hover:shadow-md">
                        {editingUser && editingUser.id === user.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(user); }} className="space-y-2">
                            <label className="block">
                              <span className="text-gray-700 text-sm font-medium">Username:</span>
                              <input
                                type="text"
                                name="username"
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                              />
                            </label>
                            <label className="block">
                              <span className="text-gray-700 text-sm font-medium">Email:</span>
                              <input
                                type="email"
                                name="email"
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                              />
                            </label>
                            <label className="block">
                              <span className="text-gray-700 text-sm font-medium">Role:</span>
                              <select
                                name="role_id"
                                value={editingUser.role_id || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, role_id: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                              >
                                <option value="">Select a Role (Optional)</option>
                                {roles.map(role => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="flex justify-end space-x-2 mt-3">
                              <button
                                type="submit"
                                className="bg-green-600 text-white py-1.5 px-3 rounded-md text-sm hover:bg-green-700 transition duration-200 shadow-md"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-gray-600 transition duration-200 shadow-md"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <strong className="text-xl text-blue-700 block mb-1">{user.username}</strong> (ID: {user.id})
                            <p className="text-gray-700 text-sm mb-1">Email: {user.email}</p>
                            {/* Display role name instead of ID */}
                            <p className="text-gray-700 text-xs mb-2">
                              Role: {user.role_id ? (roles.find(r => r.id === user.role_id)?.name || user.role_id) : 'N/A'}
                            </p>
                            <div className="flex space-x-2 mt-2">
                              {userProfile && userProfile.roleName === 'Admin' && (
                                <>
                                  <button
                                    onClick={() => setEditingUser(user)}
                                    className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-yellow-600 transition duration-200 shadow-md"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-red-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-red-600 transition duration-200 shadow-md"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {currentPage === 'roles' && (
        <>
          {/* Roles Section - Now controlled by a button */}
          <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b-2 border-blue-200 pb-2">Role Management</h2>
            <button
              onClick={() => setShowRolesList(!showRolesList)}
              className="mb-4 mr-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md"
            >
              {showRolesList ? 'Hide Roles List' : 'Show Roles List'}
            </button>
            {userProfile && userProfile.roleName === 'Admin' && (
              <button
                onClick={() => setShowNewRoleForm(!showNewRoleForm)}
                className="mb-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-200 ease-in-out transform hover:-translate-y-0.5 shadow-md"
              >
                {showNewRoleForm ? 'Hide New Role Form' : 'Add New Role'}
              </button>
            )}


            {showNewRoleForm && userProfile && userProfile.roleName === 'Admin' && (
              <form onSubmit={handleNewRoleSubmit} className="space-y-4 mt-4">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New Role</h3>
                <label className="block">
                  <span className="text-gray-700 font-medium">Name:</span>
                  <input
                    type="text"
                    name="name"
                    value={newRole.name}
                    onChange={handleNewRoleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2.5"
                  />
                </label>
                <div className="flex justify-end space-x-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 ease-in-out shadow-md"
                  >
                    Add Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewRoleForm(false)}
                    className="bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 ease-in-out shadow-md"
                  >
                    Cancel
                  </button>
                </div>
                {/* Role specific messages */}
                {roleMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline ml-2">{roleMessage}</span>
                  </div>
                )}
                {roleError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4 shadow-sm">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline ml-2">{roleError}</span>
                  </div>
                )}
              </form>
            )}

            {showRolesList && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Roles List</h3>
                {roles.length === 0 ? (
                  <p className="text-gray-600 italic">No roles found. Create one above!</p>
                ) : (
                  <ul className="space-y-4">
                    {roles.map(role => (
                      <li key={role.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm transform transition duration-200 hover:scale-[1.01] hover:shadow-md">
                        {editingRole && editingRole.id === role.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleUpdateRole(role); }} className="space-y-2">
                            <label className="block">
                              <span className="text-gray-700 text-sm font-medium">Name:</span>
                              <input
                                type="text"
                                name="name"
                                value={editingRole.name}
                                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1.5 text-sm"
                              />
                            </label>
                            <div className="flex justify-end space-x-2 mt-3">
                              <button
                                type="submit"
                                className="bg-green-600 text-white py-1.5 px-3 rounded-md text-sm hover:bg-green-700 transition duration-200 shadow-md"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRole(null)}
                                className="bg-gray-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-gray-600 transition duration-200 shadow-md"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <strong className="text-xl text-blue-700 block mb-1">{role.name}</strong> (ID: {role.id})
                            <div className="flex space-x-2 mt-2">
                              {userProfile && userProfile.roleName === 'Admin' && (
                                <>
                                  <button
                                    onClick={() => setEditingRole(role)}
                                    className="bg-yellow-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-yellow-600 transition duration-200 shadow-md"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="bg-red-500 text-white py-1.5 px-3 rounded-md text-sm hover:bg-red-600 transition duration-200 shadow-md"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
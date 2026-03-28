import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// 1. The Navigation Bar Component
function Navbar() {
  return (
    <nav className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {/* A simple placeholder logo */}
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold">M</div>
          <h1 className="text-xl font-bold tracking-wider">Agent OS</h1>
        </div>
        <div className="space-x-8 font-medium">
          <Link to="/" className="hover:text-blue-300 transition-colors">Command Center</Link>
          <Link to="/pipeline" className="hover:text-blue-300 transition-colors">Pipeline</Link>
          <Link to="/contacts" className="hover:text-blue-300 transition-colors">Databank</Link>
        </div>
      </div>
    </nav>
  );
}

// 2. The Updated Dashboard Component
function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Your actual Agent ID
  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; 

  useEffect(() => {
    axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/tasks/`)
      .then(response => {
        setTasks(response.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching tasks:", error);
        setIsLoading(false);
      });
  }, []);

  // NEW: The Two-Way Toggle Function
  const handleToggleTask = (taskId, currentStatus) => {
    // 1. Determine the exact opposite of the current status
    const newStatus = currentStatus === "True" ? "False" : "True";

    // 2. Optimistic UI Update: Map through the array and instantly flip the status
    // of the clicked task so it jumps between lists instantly.
    setTasks(currentTasks => 
      currentTasks.map(task => 
        task.task_id === taskId ? { ...task, is_completed: newStatus } : task
      )
    );

    // 3. Background Sync: Send the new status as a query parameter
    axios.patch(`http://127.0.0.1:8080/tasks/${taskId}/status?is_completed=${newStatus}`)
      .then(response => console.log(response.data.message))
      .catch(error => console.error("Database sync failed:", error));
  };

  // NEW: We slice the master state into two separate arrays for rendering
  const activeTasks = tasks.filter(task => task.is_completed === "False");
  const completedTasks = tasks.filter(task => task.is_completed === "True");

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Good Morning, Jason.</h2>
      
      {/* ACTIVE TASKS CARD */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Today's Action Items</h3>
        
        {isLoading ? (
          <p className="text-slate-500 italic animate-pulse">Syncing with database...</p>
        ) : activeTasks.length === 0 ? (
          <p className="text-emerald-600 font-medium">Inbox zero! All active tasks are completed.</p>
        ) : (
          <ul className="space-y-3">
            {activeTasks.map(task => (
              <li key={task.task_id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <input 
                  type="checkbox" 
                  checked={false}
                  onChange={() => handleToggleTask(task.task_id, task.is_completed)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                />
                <div>
                  <p className="font-medium text-slate-800">{task.task_name}</p>
                  <p className="text-sm text-slate-500">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* COMPLETED TASKS CARD (Only shows if there are actually completed tasks) */}
      {completedTasks.length > 0 && (
        <div className="bg-slate-100 rounded-xl shadow-inner border border-slate-200 p-6 opacity-75">
          <h3 className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-4">Completed Today</h3>
          <ul className="space-y-3">
            {completedTasks.map(task => (
              <li key={task.task_id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-slate-200">
                <input 
                  type="checkbox" 
                  checked={true}
                  onChange={() => handleToggleTask(task.task_id, task.is_completed)}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                />
                <div>
                  <p className="font-medium text-slate-500 line-through">{task.task_name}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}

// 3. The Kanban Pipeline Component
function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // The exact stages from your Python database blueprint
  const COLUMNS = ['Lead', 'Contact', 'Appointment', 'Active', 'Under Contract', 'Closed'];
  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; // Use your actual Agent ID

  useEffect(() => {
    axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/deals/`)
      .then(response => {
        setDeals(response.data);
        setIsLoading(false);
      })
      .catch(error => console.error("Error fetching deals:", error));
  }, []);

  // The function that fires the millisecond you drop a card
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // If dropped outside the board, or back in the exact same spot, do nothing
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;

    // 1. Optimistic UI Update: Instantly snap the card to the new column
    setDeals(currentDeals => 
      currentDeals.map(deal => 
        deal.deal_id === draggableId ? { ...deal, stage: newStage } : deal
      )
    );

    // 2. Background Sync: Tell Python to update the database AND trigger your task automations!
    axios.patch(`http://127.0.0.1:8080/deals/${draggableId}/stage`, { new_stage: newStage })
      .then(response => console.log(response.data.message))
      .catch(error => console.error("Pipeline sync failed:", error));
  };

  if (isLoading) return <div className="p-8 text-slate-500 animate-pulse">Loading Pipeline...</div>;

  return (
    <div className="p-8 h-[calc(100vh-80px)] overflow-x-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Opportunity Pipeline</h2>
      
      {/* The DragDropContext wraps the entire board and listens for mouse events */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 h-full items-start">
          
          {/* Loop through our 6 stages to create the columns */}
          {COLUMNS.map(stageName => {
            // Filter the deals that belong in this specific column
            const columnDeals = deals.filter(deal => deal.stage === stageName);

            return (
              <div key={stageName} className="bg-slate-200/50 rounded-xl p-4 w-80 flex-shrink-0 min-h-[500px] border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 uppercase tracking-wider text-sm flex justify-between">
                  {stageName} 
                  <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full text-xs">{columnDeals.length}</span>
                </h3>

                {/* The Droppable area where cards can land */}
                <Droppable droppableId={stageName}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className="space-y-3 min-h-[100px]"
                    >
                      {columnDeals.map((deal, index) => (
                        <Draggable key={deal.deal_id} draggableId={deal.deal_id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-4 rounded-lg shadow-sm border ${snapshot.isDragging ? 'border-blue-500 shadow-lg scale-105' : 'border-slate-200 hover:border-blue-300'} transition-all`}
                            >
                              <p className="font-bold text-slate-800">{deal.deal_name}</p>
                              <div className="flex justify-between items-center mt-3 text-sm">
                                <span className={`px-2 py-1 rounded-md font-medium ${deal.deal_type === 'Buyer' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {deal.deal_type}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}

        </div>
      </DragDropContext>
    </div>
  );
}

// 4. The Databank (Contacts) Component
function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mrea_category: "Haven't Met" // Our default database constraint
  });

  // ---> CHANGE THIS TO YOUR ACTUAL AGENT ID <---
  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; 

  useEffect(() => {
    axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/contacts/`)
      .then(response => {
        setContacts(response.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching contacts:", error);
        setIsLoading(false);
      });
  }, []);

  // This instantly filters the table as you type in the search bar
  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleCreateContact = (e) => {
    e.preventDefault(); // Prevents the browser from reloading the page
    
    axios.post(`http://127.0.0.1:8080/users/${AGENT_ID}/contacts/`, formData)
      .then(response => {
        // 1. Optimistic UI Update: Instantly add the new contact to our table
        setContacts([...contacts, response.data]);
        
        // 2. Close the modal and wipe the form clean for next time
        setIsModalOpen(false);
        setFormData({ first_name: '', last_name: '', email: '', phone: '', mrea_category: "Haven't Met" });
      })
      .catch(error => {
        console.error("Error creating contact:", error);
        alert("Failed to create contact. Check the console.");
      });
  };

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Databank</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          + New Contact
        </button>
      </div>

      {/* The White Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Search Bar Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* The Table Data */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading Databank...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Contact Info</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">No contacts found.</td>
                  </tr>
                ) : (
                  filteredContacts.map(contact => (
                    <tr key={contact.contact_id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{contact.first_name} {contact.last_name}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <p>{contact.email || 'No email'}</p>
                        <p>{contact.phone || 'No phone'}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${contact.mrea_category === 'Met' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {contact.mrea_category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map(tag => (
                              <span key={tag.tag_id} className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-full">
                                {tag.tag_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">No tags</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* NEW: The Create Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add New Contact</h3>
            
            <form onSubmit={handleCreateContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input required type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship Category</label>
                <select value={formData.mrea_category} onChange={(e) => setFormData({...formData, mrea_category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Haven't Met">Haven't Met (Lead)</option>
                  <option value="Met">Met (Sphere/Client)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div> // <-- This is the closing div of your Contacts component
  );
}

// 5. The Main App Engine
function App() {
  return (
    <BrowserRouter>
      {/* bg-slate-50 provides that subtle off-white professional backdrop */}
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900"> 
        <Navbar />
        
        {/* max-w-7xl keeps the content from stretching too wide on massive monitors */}
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/contacts" element={<Contacts />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

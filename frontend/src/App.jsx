import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
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
          <Link to="/settings" className="hover:text-blue-300 transition-colors">Templates</Link>
        </div>
      </div>
    </nav>
  );
}

// 2. The Updated Dashboard Component (With Native Calendar)
function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // NEW: Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const handleToggleTask = (taskId, currentStatus) => {
    const newStatus = currentStatus === "True" ? "False" : "True";
    setTasks(currentTasks => 
      currentTasks.map(task => 
        task.task_id === taskId ? { ...task, is_completed: newStatus } : task
      )
    );
    axios.patch(`http://127.0.0.1:8080/tasks/${taskId}/status?is_completed=${newStatus}`)
      .catch(error => console.error("Database sync failed:", error));
  };

  const activeTasks = tasks.filter(task => task.is_completed === "False");
  const completedTasks = tasks.filter(task => task.is_completed === "True");

  // ==========================================
  // CALENDAR MATH ENGINE
  // ==========================================
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Generates the grid cells
  const renderCalendarDays = () => {
    const days = [];
    
    // 1. Pad the beginning of the month with empty squares
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px] border border-slate-100 rounded-lg"></div>);
    }
    
    // 2. Render the actual days
    for (let day = 1; day <= daysInMonth; day++) {
      // Find all tasks due on this exact date
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const dayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === dateStr);
      
      const isToday = new Date().toDateString() === dateStr;

      days.push(
        <div key={day} className={`bg-white p-2 min-h-[120px] border rounded-lg flex flex-col transition-colors hover:border-blue-300 ${isToday ? 'border-blue-400 shadow-sm ring-1 ring-blue-400' : 'border-slate-200'}`}>
          <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
            {day}
          </span>
          <div className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {dayTasks.map(task => (
              <div 
                key={task.task_id} 
                title={task.task_name}
                className={`text-[10px] px-1.5 py-1 rounded truncate cursor-default font-medium border ${
                  task.is_completed === 'True' 
                    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' 
                    : 'bg-blue-50 border-blue-100 text-blue-700'
                }`} 
              >
                {task.task_name}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Good Morning, Jason.</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: The Task Lists */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-slate-800">Active Action Items</h3>
            
            {isLoading ? (
              <p className="text-slate-500 italic animate-pulse text-sm">Syncing with database...</p>
            ) : activeTasks.length === 0 ? (
              <p className="text-emerald-600 font-medium text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100">Inbox zero! All active tasks are completed.</p>
            ) : (
              <ul className="space-y-3">
                {activeTasks.map(task => (
                  <li key={task.task_id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors border border-slate-100 hover:border-blue-200 group">
                    <input 
                      type="checkbox" 
                      checked={false}
                      onChange={() => handleToggleTask(task.task_id, task.is_completed)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    />
                    <div>
                      <p className="font-medium text-slate-800 text-sm leading-snug group-hover:text-blue-900 transition-colors">{task.task_name}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {completedTasks.length > 0 && (
            <div className="bg-slate-100/50 rounded-xl border border-slate-200 p-6">
              <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-4">Completed</h3>
              <ul className="space-y-2">
                {completedTasks.map(task => (
                  <li key={task.task_id} className="flex items-center space-x-3 p-2 opacity-60 hover:opacity-100 transition-opacity">
                    <input 
                      type="checkbox" 
                      checked={true}
                      onChange={() => handleToggleTask(task.task_id, task.is_completed)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                    />
                    <p className="text-sm font-medium text-slate-600 line-through truncate">{task.task_name}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: The Native Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          
          {/* Calendar Header Controls */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex space-x-2">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                ← Prev
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                Next →
              </button>
            </div>
          </div>

          {/* Days of the Week Row */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          {/* The Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 flex-1">
            {renderCalendarDays()}
          </div>

        </div>
      </div>
    </div>
  );
}

// 3. The Kanban Pipeline Component (Upgraded for Split & Fit)
function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // NEW: Pipeline Tab State
  const [activeTab, setActiveTab] = useState('Buyer');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    deal_name: '',
    contact_id: '',
    deal_type: 'Buyer',
    stage: 'Lead'
  });

  const COLUMNS = ['Lead', 'Contact', 'Appointment', 'Active', 'Under Contract', 'Closed'];
  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; 

  useEffect(() => {
    const fetchDeals = axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/deals/`);
    const fetchContacts = axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/contacts/`);

    Promise.all([fetchDeals, fetchContacts])
      .then(responses => {
        setDeals(responses[0].data);
        setContacts(responses[1].data);
        setIsLoading(false);
      })
      .catch(error => console.error("Error fetching pipeline data:", error));
  }, []);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;

    setDeals(currentDeals => 
      currentDeals.map(deal => 
        deal.deal_id === draggableId ? { ...deal, stage: newStage } : deal
      )
    );

    axios.patch(`http://127.0.0.1:8080/deals/${draggableId}/stage`, { new_stage: newStage })
      .then(response => console.log(response.data.message))
      .catch(error => console.error("Pipeline sync failed:", error));
  };

  const handleCreateDeal = (e) => {
    e.preventDefault();
    if (!formData.contact_id) return alert("Please select a client for this deal.");

    axios.post(`http://127.0.0.1:8080/contacts/${formData.contact_id}/deals/`, formData)
      .then(response => {
        setDeals([...deals, response.data]); 
        setIsModalOpen(false); 
        // Reset form, but keep the deal_type aligned with whatever tab we are currently viewing
        setFormData({ deal_name: '', contact_id: '', deal_type: activeTab, stage: 'Lead' }); 
      })
      .catch(error => console.error("Error creating deal:", error));
  };

  // NEW: Pre-filter the deals so the board only renders the active tab's transactions
  const visibleDeals = deals.filter(deal => deal.deal_type === activeTab);

  if (isLoading) return <div className="p-8 text-slate-500 animate-pulse">Loading Pipeline...</div>;

  return (
    <div className="p-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Opportunity Pipeline</h2>
        <button 
          onClick={() => {
            setFormData({...formData, deal_type: activeTab}); // Auto-set the dropdown to the current tab
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + New Deal
        </button>
      </div>

      {/* NEW: The Tabbed Interface */}
      <div className="flex space-x-1 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('Buyer')}
          className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'Buyer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Buyer Pipeline
        </button>
        <button 
          onClick={() => setActiveTab('Seller')}
          className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'Seller' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Seller Pipeline
        </button>
      </div>
      
      {/* The Kanban Board (Upgraded CSS for dynamic squeezing) */}
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Removed overflow-x-auto, changed width to w-full */}
        <div className="flex w-full space-x-4 h-full items-start pb-4">
          {COLUMNS.map(stageName => {
            const columnDeals = visibleDeals.filter(deal => deal.stage === stageName);
            return (
              /* Magic CSS: flex-1 makes them share space equally. min-w-0 prevents content from forcing a wider column */
              <div key={stageName} className="bg-slate-200/50 rounded-xl p-3 flex-1 min-w-0 flex flex-col min-h-[500px] border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 uppercase tracking-wider text-xs flex justify-between items-center">
                  <span className="truncate pr-2">{stageName}</span>
                  <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">{columnDeals.length}</span>
                </h3>
                
                <Droppable droppableId={stageName}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 flex-1 min-h-[100px]">
                      {columnDeals.map((deal, index) => (
                        <Draggable key={deal.deal_id} draggableId={deal.deal_id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => navigate(`/deals/${deal.deal_id}`)} // <-- ADD THIS LINE
                              className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer ${snapshot.isDragging ? 'border-blue-500 shadow-lg scale-105 relative z-50' : 'border-slate-200 hover:border-blue-300'} transition-all`}
                            >
                              {/* truncate prevents long addresses from breaking the card layout */}
                              <p className="font-bold text-slate-800 text-sm truncate" title={deal.deal_name}>{deal.deal_name}</p>
                              <div className="flex justify-between items-center mt-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${deal.deal_type === 'Buyer' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
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

      {/* The Create Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Create New Deal</h3>
            
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deal Name / Address *</label>
                <input required type="text" placeholder="e.g. 123 Main St" value={formData.deal_name} onChange={(e) => setFormData({...formData, deal_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                <select required value={formData.contact_id} onChange={(e) => setFormData({...formData, contact_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="" disabled>Select a client...</option>
                  {contacts.map(contact => (
                    <option key={contact.contact_id} value={contact.contact_id}>
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deal Type</label>
                  <select value={formData.deal_type} onChange={(e) => setFormData({...formData, deal_type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="Buyer">Buyer</option>
                    <option value="Seller">Seller</option>
                    <option value="Lease">Lease</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stage</label>
                  <select value={formData.stage} onChange={(e) => setFormData({...formData, stage: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    {COLUMNS.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. The Contact Profile (Deep Dive) Component
// 5. The Contact Profile (Deep Dive) Component
function ContactProfile() {
  const { id } = useParams(); // Grabs the contact_id straight out of the URL
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals'); // Controls which tab is showing
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const navigate = useNavigate();

  // NEW: Tagging State
  const [allTags, setAllTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  
  // YOUR ACTUAL AGENT ID
  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; 

  useEffect(() => {
    // NEW: Fetch Contact AND Master Tag List simultaneously
    const fetchContact = axios.get(`http://127.0.0.1:8080/contacts/${id}`);
    const fetchTags = axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/tags/`);

    Promise.all([fetchContact, fetchTags])
      .then(responses => {
        setData(responses[0].data);
        setAllTags(responses[1].data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching contact details:", error);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) return <div className="p-8 text-slate-500 animate-pulse">Loading Profile...</div>;
  if (!data || !data.contact) return <div className="p-8 text-red-500">Contact not found.</div>;

  const { contact, deals } = data;

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    axios.post(`http://127.0.0.1:8080/contacts/${id}/notes/`, { content: newNoteContent })
      .then(response => {
        // Optimistically add the new note to the top of the list
        setData({
          ...data,
          notes: [response.data, ...data.notes]
        });
        setNewNoteContent(''); // Clear the text box
      })
      .catch(error => console.error("Error saving note:", error));
  };

  const handleEditClick = () => {
    setEditFormData({
      first_name: data.contact.first_name || '',
      last_name: data.contact.last_name || '',
      email: data.contact.email || '',
      phone: data.contact.phone || '',
      mrea_category: data.contact.mrea_category || "Haven't Met"
    });
    setIsEditing(true);
  };

  const handleUpdateContact = (e) => {
    e.preventDefault();
    axios.patch(`http://127.0.0.1:8080/contacts/${id}`, editFormData)
      .then(response => {
        // Optimistically update the UI with the new data
        setData({ ...data, contact: response.data });
        setIsEditing(false); // Close the edit form
      })
      .catch(error => console.error("Error updating contact:", error));
  };

  // NEW: Add a tag
  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;

    axios.post(`http://127.0.0.1:8080/contacts/${id}/tags/`, { tag_name: newTagInput })
      .then(response => {
        // Optimistically add it to the UI
        const updatedTags = data.contact.tags ? [...data.contact.tags, response.data] : [response.data];
        setData({ ...data, contact: { ...data.contact, tags: updatedTags } });
        setNewTagInput(''); // Clear input
      })
      .catch(error => console.error("Error adding tag:", error));
  };

  // NEW: Remove a tag
  const handleRemoveTag = (tagId) => {
    axios.delete(`http://127.0.0.1:8080/contacts/${id}/tags/${tagId}`)
      .then(() => {
        const updatedTags = data.contact.tags.filter(t => t.tag_id !== tagId);
        setData({ ...data, contact: { ...data.contact, tags: updatedTags } });
      })
      .catch(error => console.error("Error removing tag:", error));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link to="/contacts" className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center mb-6 transition-colors">
        ← Back to Databank
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Identity & Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            
            {isEditing ? (
              /* --- EDIT MODE FORM --- */
              <form onSubmit={handleUpdateContact} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Edit Profile</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
                  <input required type="text" value={editFormData.first_name} onChange={e => setEditFormData({...editFormData, first_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
                  <input type="text" value={editFormData.last_name} onChange={e => setEditFormData({...editFormData, last_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                  <input type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                  <input type="tel" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <select value={editFormData.mrea_category} onChange={e => setEditFormData({...editFormData, mrea_category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                    <option value="Haven't Met">Haven't Met</option>
                    <option value="Met">Met</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">Save</button>
                </div>
              </form>
            ) : (
              /* --- DISPLAY MODE --- */
              <>
                <button onClick={handleEditClick} className="absolute top-4 right-4 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                  Edit
                </button>
                
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                  {contact.first_name[0]}{contact.last_name ? contact.last_name[0] : ''}
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{contact.first_name} {contact.last_name}</h2>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${contact.mrea_category === 'Met' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {contact.mrea_category}
                </span>

                <div className="mt-6 space-y-4 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Email</p>
                    <p className="text-slate-800 font-medium">{contact.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Phone</p>
                    <p className="text-slate-800 font-medium">{contact.phone || '—'}</p>
                  </div>
                </div>

                {/* NEW: Tags Section */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Tags</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map(tag => (
                        <span key={tag.tag_id} className="group flex items-center bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">
                          {tag.tag_name}
                          <button onClick={() => handleRemoveTag(tag.tag_id)} className="ml-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No tags added yet.</span>
                    )}
                  </div>

                  <form onSubmit={handleAddTag} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      list="existing-tags"
                      placeholder="Add or create a tag..." 
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <datalist id="existing-tags">
                      {allTags.map(tag => (
                        <option key={tag.tag_id} value={tag.tag_name} />
                      ))}
                    </datalist>
                    <button type="submit" className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">
                      Add
                    </button>
                  </form>
                </div>
              </>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: The Main Stage (Tabs) */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button onClick={() => setActiveTab('deals')} className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'deals' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Active Deals ({deals.length})
            </button>
            <button onClick={() => setActiveTab('notes')} className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Notes & Timeline
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'deals' && (
              <div className="space-y-4">
                {deals.length === 0 ? (
                  <p className="text-slate-500 italic">No active deals for this contact.</p>
                ) : (
                  deals.map(deal => (
                    <div 
                      key={deal.deal_id} 
                      onClick={() => navigate(`/deals/${deal.deal_id}`)}
                      className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors bg-slate-50 flex justify-between items-center cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-800 hover:text-blue-600 transition-colors">{deal.deal_name}</p>
                        <p className="text-sm text-slate-500">{deal.stage}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${deal.deal_type === 'Buyer' ? 'bg-blue-200 text-blue-800' : 'bg-emerald-200 text-emerald-800'}`}>
                        {deal.deal_type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* The Input Area */}
                <div className="space-y-3">
                  <textarea 
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" 
                    placeholder="Log a call, write a note, or document a timeline event..."
                  ></textarea>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleAddNote}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                      Save Note
                    </button>
                  </div>
                </div>

                {/* The Timeline Feed */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {data.notes && data.notes.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-4">No notes recorded yet.</p>
                  ) : (
                    data.notes.map(note => (
                      <div key={note.note_id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-slate-800 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// 4. The Databank (Contacts) Component
function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // NEW: State for our Master Tag List and the currently selected filter
  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mrea_category: "Haven't Met" 
  });

  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; 

  useEffect(() => {
    // NEW: Fetch both Contacts and Master Tags simultaneously
    const fetchContacts = axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/contacts/`);
    const fetchTags = axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/tags/`);

    Promise.all([fetchContacts, fetchTags])
      .then(responses => {
        setContacts(responses[0].data);
        setAllTags(responses[1].data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching databank data:", error);
        setIsLoading(false);
      });
  }, []);

  // NEW: The upgraded multi-filter engine
  const filteredContacts = contacts.filter(contact => {
    // 1. Text Search Match
    const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase();
    const matchesText = fullName.includes(searchTerm.toLowerCase()) || 
                        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 2. Tag Match (If no tag is selected, everyone passes. Otherwise, check their tags array)
    const matchesTag = selectedTag === "" ? true : 
                       (contact.tags && contact.tags.some(t => t.tag_name === selectedTag));

    // A contact only shows up if they pass BOTH tests
    return matchesText && matchesTag;
  });

  const handleCreateContact = (e) => {
    e.preventDefault(); 
    
    axios.post(`http://127.0.0.1:8080/users/${AGENT_ID}/contacts/`, formData)
      .then(response => {
        setContacts([...contacts, response.data]);
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
        
        {/* NEW: Upgraded Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select 
            value={selectedTag} 
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag.tag_id} value={tag.tag_name}>
                {tag.tag_name}
              </option>
            ))}
          </select>
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
                    <td colSpan="4" className="p-8 text-center text-slate-500">No contacts found matching criteria.</td>
                  </tr>
                ) : (
                  filteredContacts.map(contact => (
                    <tr 
                      key={contact.contact_id} 
                      onClick={() => navigate(`/contacts/${contact.contact_id}`)}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                    >
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
      
      {/* ... (Keep your Create Contact Modal code exactly the same down here) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add New Contact</h3>
            
            <form onSubmit={handleCreateContact} className="space-y-4">
              {/* Form content remains the same */}
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
    </div>
  );
}

// 6. The Deal Profile (Deep Dive) Component
function DealProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  
  // New States for the Compliance Engine
  const [dealDocs, setDealDocs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [rejectionNotes, setRejectionNotes] = useState({}); // Stores draft notes before saving

  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271";

  useEffect(() => {
    // We fetch the Deal, the Master Templates, AND the cloned Documents all at once
    const fetchDeal = axios.get(`http://127.0.0.1:8080/deals/${id}`);
    const fetchTemplates = axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/templates/`);
    const fetchDocs = axios.get(`http://127.0.0.1:8080/deals/${id}/documents/`);

    Promise.all([fetchDeal, fetchTemplates, fetchDocs])
      .then(responses => {
        setData(responses[0].data);
        
        // Only show templates that match this deal's type (Buyer/Seller/Lease)
        const dealType = responses[0].data.deal.deal_type;
        setTemplates(responses[1].data.filter(t => t.deal_type === dealType));
        
        setDealDocs(responses[2].data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching deal ecosystem:", error);
        setIsLoading(false);
      });
  }, [id]);

  const handleToggleTask = (taskId, currentStatus) => {
    const newStatus = currentStatus === "True" ? "False" : "True";
    setData(prevData => ({
      ...prevData,
      tasks: prevData.tasks.map(task => 
        task.task_id === taskId ? { ...task, is_completed: newStatus } : task
      )
    }));
    axios.patch(`http://127.0.0.1:8080/tasks/${taskId}/status?is_completed=${newStatus}`);
  };

  const handleEditClick = () => {
    setEditFormData({
      deal_name: data.deal.deal_name || '',
      estimated_value: data.deal.estimated_value || '',
      commission_rate: data.deal.commission_rate || '',
      expected_close_date: data.deal.expected_close_date ? new Date(data.deal.expected_close_date).toISOString().split('T')[0] : ''
    });
    setIsEditing(true);
  };

  const handleUpdateDeal = (e) => {
    e.preventDefault();
    const submissionData = { ...editFormData };
    if (submissionData.expected_close_date === '') submissionData.expected_close_date = null;

    axios.patch(`http://127.0.0.1:8080/deals/${id}`, submissionData)
      .then(response => {
        setData({ ...data, deal: response.data });
        setIsEditing(false);
      })
      .catch(error => console.error("Error updating deal:", error));
  };

  // ==========================================
  // COMPLIANCE ENGINE FUNCTIONS
  // ==========================================
  const handleApplyTemplate = () => {
    if (!selectedTemplateId) return;
    
    axios.post(`http://127.0.0.1:8080/deals/${id}/apply-template/${selectedTemplateId}`)
      .then(response => setDealDocs(response.data)) // Instantly renders the new checklist
      .catch(error => console.error("Error cloning template:", error));
  };

  const handleDocStatusChange = (docId, newStatus) => {
    // Optimistic UI Update
    setDealDocs(currentDocs => currentDocs.map(doc => 
      doc.doc_id === docId ? { ...doc, status: newStatus } : doc
    ));

    // If they change it to anything other than rejected, we clear the notes
    const payload = { new_status: newStatus };
    if (newStatus !== "Rejected") {
      payload.reviewer_notes = ""; 
    }

    axios.patch(`http://127.0.0.1:8080/deal-documents/${docId}/status`, payload)
      .catch(error => console.error("Database sync failed:", error));
  };

  const handleSaveRejectionNote = (docId) => {
    const note = rejectionNotes[docId] || "";
    
    // Update the local state so the note displays immediately
    setDealDocs(currentDocs => currentDocs.map(doc => 
      doc.doc_id === docId ? { ...doc, reviewer_notes: note } : doc
    ));

    axios.patch(`http://127.0.0.1:8080/deal-documents/${docId}/status`, { 
      new_status: "Rejected", 
      reviewer_notes: note 
    }).then(() => {
      // Clear the draft input state
      setRejectionNotes(prev => ({ ...prev, [docId]: "" }));
    });
  };

  if (isLoading) return <div className="p-8 text-slate-500 animate-pulse">Loading Deal File...</div>;
  if (!data || !data.deal) return <div className="p-8 text-red-500">Deal not found.</div>;

  const { deal, contact, tasks } = data;
  const activeTasks = tasks.filter(t => t.is_completed === "False");
  const completedTasks = tasks.filter(t => t.is_completed === "True");

  // Helper for status badge colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Uploaded': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link to="/pipeline" className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center mb-6 transition-colors">
        ← Back to Pipeline
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{deal.deal_name}</h2>
          <div className="flex space-x-3 mt-2">
            <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${deal.deal_type === 'Buyer' ? 'bg-blue-200 text-blue-800' : 'bg-emerald-200 text-emerald-800'}`}>
              {deal.deal_type}
            </span>
            <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-slate-200 text-slate-700">
              Stage: {deal.stage}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Deal Data & Client Info */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Financials / Edit Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            {isEditing ? (
              <form onSubmit={handleUpdateDeal} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Edit Transaction</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Deal Name / Address</label>
                  <input required type="text" value={editFormData.deal_name} onChange={e => setEditFormData({...editFormData, deal_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Expected Close Date</label>
                  <input type="date" value={editFormData.expected_close_date} onChange={e => setEditFormData({...editFormData, expected_close_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Est. Value</label>
                    <input type="text" placeholder="$500,000" value={editFormData.estimated_value} onChange={e => setEditFormData({...editFormData, estimated_value: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Comm. %</label>
                    <input type="text" placeholder="3%" value={editFormData.commission_rate} onChange={e => setEditFormData({...editFormData, commission_rate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">Save</button>
                </div>
              </form>
            ) : (
              <>
                <button onClick={handleEditClick} className="absolute top-4 right-4 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                  Edit
                </button>
                <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Transaction Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expected Close</p>
                    <p className="text-slate-800 font-medium">
                      {deal.expected_close_date 
                        ? new Date(new Date(deal.expected_close_date).getTime() + new Date().getTimezoneOffset() * 60000).toLocaleDateString() 
                        : 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Value</p>
                    <p className="text-slate-800 font-medium">{deal.estimated_value || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Commission Rate</p>
                    <p className="text-slate-800 font-medium">{deal.commission_rate || '—'}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* The Linked Client Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Associated Client</h3>
            <Link to={`/contacts/${contact.contact_id}`} className="group block">
              <p className="font-bold text-blue-600 group-hover:text-blue-800 transition-colors text-lg">
                {contact.first_name} {contact.last_name}
              </p>
              <p className="text-sm text-slate-600 mt-1">{contact.email || 'No email on file'}</p>
              <p className="text-sm text-slate-600">{contact.phone || 'No phone on file'}</p>
            </Link>
          </div>

        </div>

        {/* RIGHT COLUMN: Checklists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. COMPLIANCE DOCUMENTS CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Broker Compliance</h3>
              <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 border border-slate-200 rounded-md">
                {dealDocs.filter(d => d.status === 'Approved').length} / {dealDocs.length} Approved
              </span>
            </div>
            
            <div className="p-6">
              {dealDocs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 mb-4 text-sm">No compliance template applied yet.</p>
                  <div className="flex items-center justify-center space-x-2">
                    <select 
                      value={selectedTemplateId}
                      onChange={e => setSelectedTemplateId(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white min-w-[200px]"
                    >
                      <option value="" disabled>Select a {deal.deal_type} Template...</option>
                      {templates.map(t => (
                        <option key={t.template_id} value={t.template_id}>{t.template_name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleApplyTemplate}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
                    >
                      Apply Documents
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  {dealDocs.map(doc => (
                    <li key={doc.doc_id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                      
                      {/* Top Row: Name and Status Dropdown */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{doc.document_name}</p>
                          {doc.is_required === 'True' && (
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Required</span>
                          )}
                        </div>
                        <select
                          value={doc.status}
                          onChange={(e) => handleDocStatusChange(doc.doc_id, e.target.value)}
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border outline-none cursor-pointer ${getStatusColor(doc.status)}`}
                        >
                          <option value="Missing">Missing</option>
                          <option value="Uploaded">Uploaded</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      {/* Bottom Row: The Rejection Engine */}
                      {doc.status === 'Rejected' && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          {doc.reviewer_notes ? (
                            <div className="flex justify-between items-start">
                              <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100 flex-1">
                                <strong>MCA Note:</strong> {doc.reviewer_notes}
                              </p>
                              <button 
                                onClick={() => handleSaveRejectionNote(doc.doc_id)} // Saving an empty string clears it if they want to edit
                                className="text-xs text-slate-500 hover:text-blue-600 ml-2 mt-1"
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <input 
                                type="text"
                                placeholder="Reason for rejection (e.g. Missing signature on page 2)..."
                                value={rejectionNotes[doc.doc_id] || ''}
                                onChange={(e) => setRejectionNotes({...rejectionNotes, [doc.doc_id]: e.target.value})}
                                className="flex-1 px-3 py-1.5 border border-red-300 focus:border-red-500 rounded text-xs outline-none bg-white"
                              />
                              <button 
                                onClick={() => handleSaveRejectionNote(doc.doc_id)}
                                className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                              >
                                Save Note
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 2. AUTOMATED ACTION ITEMS CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Action Items</h3>
            </div>
            
            <div className="p-6">
              {tasks.length === 0 ? (
                <p className="text-slate-500 italic text-center py-4">No automated tasks currently active.</p>
              ) : (
                <div className="space-y-6">
                  {activeTasks.length > 0 && (
                    <ul className="space-y-3">
                      {activeTasks.map(task => (
                        <li key={task.task_id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-slate-200 transition-colors hover:border-blue-300 shadow-sm">
                          <input 
                            type="checkbox" 
                            checked={false}
                            onChange={() => handleToggleTask(task.task_id, task.is_completed)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          />
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{task.task_name}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {completedTasks.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Completed</h4>
                      <ul className="space-y-2 opacity-75">
                        {completedTasks.map(task => (
                          <li key={task.task_id} className="flex items-center space-x-3 p-2">
                            <input 
                              type="checkbox" 
                              checked={true}
                              onChange={() => handleToggleTask(task.task_id, task.is_completed)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                            />
                            <p className="text-sm font-medium text-slate-500 line-through">{task.task_name}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// 7. The Compliance Settings Component (Phase 2 Master Templates)
function ComplianceSettings() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form States
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('Buyer');
  const [newDocName, setNewDocName] = useState('');

  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271";

  // Fetch all templates on load
  const fetchTemplates = () => {
    axios.get(`http://127.0.0.1:8080/users/${AGENT_ID}/templates/`)
      .then(response => {
        setTemplates(response.data);
        setIsLoading(false);
        // If we were looking at a template, update it so the new documents appear
        if (selectedTemplate) {
          const updatedSelection = response.data.find(t => t.template_id === selectedTemplate.template_id);
          setSelectedTemplate(updatedSelection);
        }
      })
      .catch(error => {
        console.error("Error fetching templates:", error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    axios.post(`http://127.0.0.1:8080/users/${AGENT_ID}/templates/`, {
      template_name: newTemplateName,
      deal_type: newTemplateType
    })
      .then(() => {
        setNewTemplateName('');
        fetchTemplates(); // Refresh the list
      })
      .catch(error => console.error("Error creating template:", error));
  };

  const handleAddDocument = (e) => {
    e.preventDefault();
    if (!selectedTemplate || !newDocName.trim()) return;

    axios.post(`http://127.0.0.1:8080/templates/${selectedTemplate.template_id}/items/`, {
      document_name: newDocName,
      is_required: "True"
    })
      .then(() => {
        setNewDocName('');
        fetchTemplates(); // Refresh to pull down the newly nested item
      })
      .catch(error => console.error("Error adding document:", error));
  };

  if (isLoading) return <div className="p-8 text-slate-500 animate-pulse">Loading Settings...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Compliance Settings</h2>
        <p className="text-slate-500 mt-1">Manage your master document checklists for different transaction types.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Template Management */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Create Template Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Create Master Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Template Name</label>
                <input required type="text" placeholder="e.g. Standard AZ Buyer" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Type</label>
                <select value={newTemplateType} onChange={e => setNewTemplateType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                  <option value="Buyer">Buyer</option>
                  <option value="Seller">Seller</option>
                  <option value="Lease">Lease</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded font-medium transition-colors text-sm shadow-sm">
                + Create Template
              </button>
            </form>
          </div>

          {/* Existing Templates List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Your Templates</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {templates.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 italic text-center">No templates built yet.</p>
              ) : (
                templates.map(template => (
                  <div 
                    key={template.template_id} 
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 flex justify-between items-center ${selectedTemplate?.template_id === template.template_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{template.template_name}</p>
                      <p className="text-xs text-slate-500">{template.items?.length || 0} Documents</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${template.deal_type === 'Buyer' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {template.deal_type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Document Checklist Editor */}
        <div className="md:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedTemplate.template_name} Checklist</h3>
                  <p className="text-sm text-slate-500 mt-1">Add the specific documents required for this transaction type.</p>
                </div>
              </div>

              {/* Add Document Form */}
              <div className="p-6 border-b border-slate-100 bg-white">
                <form onSubmit={handleAddDocument} className="flex space-x-3">
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Real Estate Agency Disclosure and Election" 
                    value={newDocName} 
                    onChange={e => setNewDocName(e.target.value)} 
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm whitespace-nowrap">
                    Add Document
                  </button>
                </form>
              </div>

              {/* Required Documents List */}
              <div className="flex-1 p-6 bg-slate-50/50">
                {selectedTemplate.items && selectedTemplate.items.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedTemplate.items.map((item, index) => (
                      <li key={item.item_id} className="flex items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold mr-4">
                          {index + 1}
                        </span>
                        <p className="font-medium text-slate-800 flex-1">{item.document_name}</p>
                        <span className="text-xs font-bold text-red-500 uppercase bg-red-50 px-2 py-1 rounded border border-red-100">
                          Required
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-12">
                    <p className="italic">No documents added to this template yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl h-full min-h-[500px] flex items-center justify-center">
              <p className="text-slate-500 font-medium">Select or create a template to manage its documents.</p>
            </div>
          )}
        </div>

      </div>
    </div>
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
            <Route path="/contacts/:id" element={<ContactProfile />} />
            <Route path="/deals/:id" element={<DealProfile />} />
            <Route path="/settings" element={<ComplianceSettings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

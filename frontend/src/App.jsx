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
  const [contacts, setContacts] = useState([]); // NEW: To populate our dropdown
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    deal_name: '',
    contact_id: '',
    deal_type: 'Buyer',
    stage: 'Lead'
  });

  const COLUMNS = ['Lead', 'Contact', 'Appointment', 'Active', 'Under Contract', 'Closed'];
  
  // ---> CHANGE THIS TO YOUR ACTUAL AGENT ID <---
  const AGENT_ID = "7fd135a8-e667-4ae3-ab21-c289e89a3271"; 

  useEffect(() => {
    // NEW: Fetch both Deals AND Contacts at the exact same time
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

  // NEW: The Deal Creation Function
  const handleCreateDeal = (e) => {
    e.preventDefault();
    if (!formData.contact_id) return alert("Please select a client for this deal.");

    axios.post(`http://127.0.0.1:8080/contacts/${formData.contact_id}/deals/`, formData)
      .then(response => {
        setDeals([...deals, response.data]); // Optimistic UI update
        setIsModalOpen(false); // Close modal
        setFormData({ deal_name: '', contact_id: '', deal_type: 'Buyer', stage: 'Lead' }); // Reset
      })
      .catch(error => console.error("Error creating deal:", error));
  };

  if (isLoading) return <div className="p-8 text-slate-500 animate-pulse">Loading Pipeline...</div>;

  return (
    <div className="p-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Opportunity Pipeline</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + New Deal
        </button>
      </div>
      
      {/* The Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 h-full items-start overflow-x-auto pb-4">
          {COLUMNS.map(stageName => {
            const columnDeals = deals.filter(deal => deal.stage === stageName);
            return (
              <div key={stageName} className="bg-slate-200/50 rounded-xl p-4 w-80 flex-shrink-0 min-h-[500px] border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 uppercase tracking-wider text-sm flex justify-between">
                  {stageName} 
                  <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full text-xs">{columnDeals.length}</span>
                </h3>
                <Droppable droppableId={stageName}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[100px]">
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

      {/* NEW: The Create Deal Modal */}
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
                    <div key={deal.deal_id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors bg-slate-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{deal.deal_name}</p>
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
            <Route path="/contacts/:id" element={<ContactProfile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

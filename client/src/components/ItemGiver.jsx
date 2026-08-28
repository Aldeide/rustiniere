import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Users, 
  Send, 
  CheckCircle, 
  Plus, 
  Layers, 
  Filter 
} from 'lucide-react';
import { api } from '../services/api';

export default function ItemGiver({ players, preselectedPlayer, onSendCommand }) {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [targetPlayer, setTargetPlayer] = useState(preselectedPlayer?.SteamID || 'all');
  const [amount, setAmount] = useState(1);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api.getItems().then(data => {
      setItems(data || []);
      if (data && data.length > 0) setSelectedItem(data[0]);
    });
  }, []);

  useEffect(() => {
    if (preselectedPlayer) {
      setTargetPlayer(preselectedPlayer.SteamID);
    }
  }, [preselectedPlayer]);

  const categories = ['All', 'Weapons', 'Ammunition', 'Resources', 'Medical', 'Tools', 'Attire', 'Construction', 'Traps', 'Items'];

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery = item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const handleGive = async () => {
    if (!selectedItem) return;

    let cmd = '';
    if (targetPlayer === 'all') {
      cmd = `give ${selectedItem.id} ${amount}`;
    } else {
      cmd = `inventory.giveto ${targetPlayer} ${selectedItem.id} ${amount}`;
    }

    try {
      await onSendCommand(cmd);
      setFeedback(`Gave ${amount}x ${selectedItem.name} successfully!`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback(`Error: ${e.message}`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left 2 Cols: Catalog & Search */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Top Header & Search */}
        <div className="bg-[#15161c] p-4 rounded-2xl border border-[#24252e] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#20222a] flex items-center justify-center text-[#cd4628]">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Rust Item Database</h2>
                <p className="text-xs text-[#71737e]">{filteredItems.length} items found</p>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#71737e]" />
              <input
                type="text"
                placeholder="Search items (e.g. ak, c4, scrap)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f1013] text-xs text-white pl-9 pr-4 py-2.5 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628]"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#cd4628] text-white shadow-lg shadow-[#cd4628]/20'
                    : 'bg-[#1b1c23] text-[#8e909a] hover:text-white hover:bg-[#252731]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="bg-[#15161c] p-4 rounded-2xl border border-[#24252e] max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredItems.map(item => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setAmount(1);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-[#291b17] border-[#cd4628] shadow-lg shadow-[#cd4628]/15'
                      : 'bg-[#1a1b22] border-[#252732] hover:border-[#3b3d4d]'
                  }`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8e909a] tracking-wider block mb-1">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#fdba74] transition-colors line-clamp-2">
                      {item.name}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#23242e] flex items-center justify-between text-[10px] font-mono text-[#6c7081]">
                    <span className="truncate">{item.id}</span>
                    <span className="text-[#a0a4b2]">x{item.stack}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Col: Giving Configuration & Execution Panel */}
      <div className="space-y-4">
        
        <div className="bg-[#15161c] p-5 rounded-2xl border border-[#24252e] shadow-xl space-y-5 sticky top-20">
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#cd4628]" />
            <span>Spawn Configuration</span>
          </h3>

          {/* Selected Item Preview */}
          {selectedItem ? (
            <div className="p-4 rounded-xl bg-[#1b1c24] border border-[#2c2e3a] space-y-2">
              <div className="text-[10px] uppercase font-bold text-[#cd4628]">{selectedItem.category}</div>
              <h4 className="text-base font-extrabold text-white">{selectedItem.name}</h4>
              <div className="text-xs font-mono text-[#8e909a]">Shortname: <code className="text-[#38bdf8]">{selectedItem.id}</code></div>
              <div className="text-xs text-[#8e909a]">Default Stack: <strong className="text-white">{selectedItem.stack}</strong></div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#676a79] bg-[#1a1b22] rounded-xl border border-[#252732]">
              Select an item from catalog
            </div>
          )}

          {/* Target Player Dropdown */}
          <div>
            <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1.5">Target Recipient</label>
            <div className="relative">
              <select
                value={targetPlayer}
                onChange={(e) => setTargetPlayer(e.target.value)}
                className="w-full bg-[#0f1013] text-white text-xs px-3 py-2.5 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628] appearance-none cursor-pointer"
              >
                <option value="all">🌟 All Online Players ({players.length})</option>
                {players.map(p => (
                  <option key={p.SteamID} value={p.SteamID}>
                    👤 {p.DisplayName} ({p.SteamID})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity Controls */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#8e909a] uppercase">Quantity</label>
              <span className="text-xs font-mono text-[#cd4628] font-bold">{amount}</span>
            </div>
            
            <input
              type="number"
              min="1"
              max="100000"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#0f1013] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628] mb-2"
            />

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 5, 10, 50, 100, 500, 1000, selectedItem?.stack || 64].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setAmount(q)}
                  className="py-1 rounded-lg bg-[#1e2028] hover:bg-[#2c2f3b] text-[11px] font-mono font-bold text-[#a0a4b5] hover:text-white transition-colors"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Toast feedback */}
          {feedback && (
            <div className="p-3 bg-[#152a1d] border border-[#255234] rounded-xl text-xs font-semibold text-[#4ade80] flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Give Button */}
          <button
            onClick={handleGive}
            disabled={!selectedItem}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#cd4628] to-[#ea580c] hover:from-[#ba3e22] hover:to-[#d64f0b] text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#cd4628]/25 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Give {amount}x Item</span>
          </button>

        </div>

      </div>

    </div>
  );
}

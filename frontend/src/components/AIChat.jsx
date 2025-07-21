import React, { useState, useRef, useEffect } from 'react';
import { Send, Download, BarChart3, Table, MessageCircle } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { apiUrl } from '../api';
import Sidebar from './Sidebar';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Halo! Saya Lapia, asisten AI anda. Siap membantu! Coba tanyakan kepada saya pertanyaan seperti "Tampilkan data WIP bulan ini dalam tabel" atau "Buat grafik produk berdasarkan kategori".',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputMessage,
          history: messages.slice(-10).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.message,
        timestamp: new Date(),
        data: data.data || null,
        chartConfig: data.chartConfig || null,
        tableData: data.tableData || null
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportToExcel = (tableData, filename = 'dashboard_data') => {
    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const renderChart = (chartConfig) => {
    const { type, data, options } = chartConfig;
    
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: options?.title || 'Chart'
        }
      },
      ...options
    };

    switch (type) {
      case 'line':
        return <Line data={data} options={chartOptions} />;
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={data} options={chartOptions} />;
      default:
        return <Bar data={data} options={chartOptions} />;
    }
  };

  const renderTable = (tableData) => {
    if (!tableData || tableData.length === 0) return null;

    const headers = Object.keys(tableData[0]);
    
    return (
      <div className="ai-table-container">
        <div className="ai-table-header">
          <h4>Data Table</h4>
          <button
            className="export-btn"
            onClick={() => exportToExcel(tableData)}
            title="Export to Excel"
          >
            <Download size={16} />
            Export
          </button>
        </div>
        <div className="ai-table-wrapper">
          <table className="ai-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.slice(0, 100).map((row, index) => (
                <tr key={index}>
                  {headers.map((header, cellIndex) => (
                    <td key={cellIndex}>{row[header]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {tableData.length > 100 && (
            <div className="table-footer">
              Showing 100 of {tableData.length} rows. Click export to download all data.
            </div>
          )}
          {tableData.length <= 100 && tableData.length > 0 && (
            <div className="table-footer">
              Showing all {tableData.length} rows.
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="ai-chat-container">
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <MessageCircle className="chat-icon" />
              <h3>Lapia</h3>
            </div>
            <div className="ai-chat-status">
              <div className="status-indicator online"></div>
              <span>Online</span>
            </div>
          </div>

          <div className="ai-chat-messages" ref={chatContainerRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.type} ${message.isError ? 'error' : ''}`}
              >
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  
                  {message.chartConfig && (
                    <div className="message-chart">
                      <div className="chart-container">
                        {renderChart(message.chartConfig)}
                      </div>
                    </div>
                  )}
                  
                  {message.tableData && renderTable(message.tableData)}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message ai loading">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input">
            <div className="input-container">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanya saya sesuatu..."
                className="message-input"
                rows="1"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="send-button"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="input-suggestions">
              <span className="suggestion-label">Try:</span>
              <button onClick={() => setInputMessage("Show WIP data in a table")}>
                <Table size={14} /> Table
              </button>
              <button onClick={() => setInputMessage("Create a chart of products by category")}>
                <BarChart3 size={14} /> Chart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;

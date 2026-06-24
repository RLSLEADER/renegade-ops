import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

class RootErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error("Root error:", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#1A3A5C",color:"white",fontFamily:"system-ui",padding:40,flexDirection:"column",gap:16,textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700}}>Renegade Land Title & Leasing</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.7)"}}>Something went wrong loading the app.</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",maxWidth:500,wordBreak:"break-all",fontFamily:"monospace"}}>{String(this.state.error)}</div>
          <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",background:"#C8742A",border:"none",borderRadius:8,color:"white",fontSize:14,cursor:"pointer"}}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

root.render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

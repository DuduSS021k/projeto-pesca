import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Ship, Anchor, MapPin, BarChart3 } from 'lucide-react';

function App() {
  const [dados, setDados] = useState([]);
  const [topPortos, setTopPortos] = useState([]);
  const [topEstados, setTopEstados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Lê o arquivo CSV que está na pasta public
    Papa.parse('/dados_pesca.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (resultado) => {
        const dadosBrutos = resultado.data;
        setDados(dadosBrutos);

        const contagemPortos = {};
        const contagemEstados = {};

        // Varre os dados fazendo o agrupamento (Agregação OLAP em memória)
        dadosBrutos.forEach(item => {
          // Ajusta os nomes das colunas exatamente como vêm no CSV
          const porto = item.portoChegada || item.PORTO_CHEGADA || 'Não Informado';
          const estado = item.ufEmbarcacao || item.UF_EMBARCACAO || 'Outros';

          if(porto) contagemPortos[porto] = (contagemPortos[porto] || 0) + 1;
          if(estado) contagemEstados[estado] = (contagemEstados[estado] || 0) + 1;
        });

        // Ordena e pega os 5 portos mais movimentados
        const formatadoPortos = Object.keys(contagemPortos)
          .map(key => ({ name: key, total: contagemPortos[key] }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Ordena e pega os 4 estados líderes
        const formatadoEstados = Object.keys(contagemEstados)
          .map(key => ({ name: key, value: contagemEstados[key] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 4);

        setTopPortos(formatadoPortos);
        setTopEstados(formatadoEstados);
        setCarregando(false);
      },
      error: (erro) => {
        console.error("Erro ao ler o CSV:", erro);
        setCarregando(false);
      }
    });
  }, []);

  const CORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5' }}>
        <h2>Carregando e processando dados dos Mapas de Bordo...</h2>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Cabeçalho do Painel */}
      <header style={{ marginBottom: '30px', borderBottom: '2px solid #ddd', paddingBottom: '15px' }}>
        <h1 style={{ color: '#1a365d', margin: 0 }}>🚢 Painel Estratégico - Mapas de Bordo (MPA)</h1>
        <p style={{ color: '#4a5568', margin: '5px 0 0 0' }}>Análise de desembarque e atividade pesqueira nacional</p>
      </header>

      {/* Cards de Métricas Principais (KPIs) */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '220px' }}>
          <Ship size={40} color="#0088FE" />
          <div>
            <h3 style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Total de Viagens</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>{dados.length}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '220px' }}>
          <Anchor size={40} color="#00C49F" />
          <div>
            <h3 style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Porto Principal</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#2d3748' }}>{topPortos[0]?.name || 'Não Identificado'}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '220px' }}>
          <MapPin size={40} color="#FFBB28" />
          <div>
            <h3 style={{ margin: 0, color: '#718096', fontSize: '14px' }}>Estado Líder (UF)</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>{topEstados[0]?.name || '...'}</p>
          </div>
        </div>
      </div>

      {/* Seção dos Gráficos Analíticos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Gráfico de Barras - Portos */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '10px' }}><BarChart3 size={20} /> Top 5 Portos de Desembarque</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPortos}>
                <XAxis dataKey="name" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis stroke="#718096" />
                <Tooltip />
                <Bar dataKey="total" fill="#3182ce" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza - Estados */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>Distribuição por UF da Embarcação</h3>
          <div style={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={topEstados} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {topEstados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '10px' }}>
              {topEstados.map((item, index) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: CORES[index % CORES.length], borderRadius: '50%' }}></div>
                  <span style={{ fontWeight: 'bold', color: '#4a5568' }}>{item.name}:</span> {item.value}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
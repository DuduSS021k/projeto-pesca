import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Ship, Anchor, Clock } from 'lucide-react';

function App() {
  const [dados, setDados] = useState([]);
  const [topPortos, setTopPortos] = useState([]);
  const [frotasUf, setFrotasUf] = useState([]);
  const [tempoPorModalidade, setTempoPorModalidade] = useState([]);
  const [usoAuxiliar, setUsoAuxiliar] = useState([]);
  const [sazonalidade, setSazonalidade] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // FUNÇÃO AUXILIAR: Converte formatos de data brasileiros (DD/MM/AAAA) ou ISO para objeto Date válido
  const converterParaData = (stringData) => {
    if (!stringData) return null;
    const limpa = stringData.toString().trim();
    if (limpa.includes('/')) {
      const partes = limpa.split(' ')[0].split('/');
      if (partes.length === 3) {
        return new Date(partes[2], partes[1] - 1, partes[0]);
      }
    }
    const tentativaDireta = new Date(limpa);
    return isNaN(tentativaDireta.getTime()) ? null : tentativaDireta;
  };

  useEffect(() => {
    // Faz o fetch direto no endpoint do webhook do n8n que o professor pediu
    fetch('http://localhost:5678/webhook/dados-finais')
      .then((response) => {
        if (!response.ok) throw new Error('Erro na resposta do n8n');
        return response.json(); 
      })
      .then((dadosProcessados) => {
        // CORREÇÃO DEFINTIVA: Garante que o estado 'dados' recebe o array e nunca fica undefined
        if (Array.isArray(dadosProcessados)) {
          setDados(dadosProcessados);
        } else {
          setDados([]);
          setCarregando(false);
          return;
        }

        const portosMap = {};
        const ufsMap = {};
        const modalidadesMap = {};
        const frotasAuxMap = { "Apenas Principal": 0, "Usa Apoio (2ª/3ª)": 0 };
        const mesesMap = {};

        dadosProcessados.forEach(item => {
          // Extração das colunas chave vindas tratadas do n8n
          const porto = (item.portoChegada || item.Porto || '').toString().trim().toUpperCase();
          const uf = (item.ufEmbarcacaoUm || item.UF || '').toString().trim().toUpperCase();
          const modalidade = (item.modeloMapaDeBordo || item.modalidade || '').toString().trim().toUpperCase();
          const apoioDois = (item.nomeEmbarcacaoDois || '').toString().trim();
          const apoioTres = (item.nomeEmbarcacaoTres || '').toString().trim();
          
          const dSaida = converterParaData(item.dataSaida);
          const dChegada = converterParaData(item.dataChegada);

          const invalido = (txt) => !txt || txt === 'NÃO INFORMADO' || txt === 'NAO INFORMADO' || txt === 'NULL' || txt === 'OUTROS' || txt === '0' || txt === '-';

          // 1. Tratamento de Portos e Frotas (UFs)
          if (!invalido(porto)) {
            const pTratado = porto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            portosMap[pTratado] = (portosMap[pTratado] || 0) + 1;
          }
          if (!invalido(uf)) {
            ufsMap[uf] = (ufsMap[uf] || 0) + 1;
          }

          // 2. Mapeamento de Tempo Médio e Modalidade (Regra de Negócio 1)
          if (dSaida && dChegada && dChegada >= dSaida) {
            const dias = (dChegada - dSaida) / (1000 * 60 * 60 * 24);
            if (!invalido(modalidade)) {
              if (!modalidadesMap[modalidade]) modalidadesMap[modalidade] = { soma: 0, qtd: 0 };
              modalidadesMap[modalidade].soma += dias;
              modalidadesMap[modalidade].qtd += 1;
            }

            // 3. Sazonalidade por Mês (Regra de Negócio 3)
            const ano = dSaida.getFullYear();
            const mesIndice = dSaida.getMonth() + 1;
            const chaveMes = `${ano}-${mesIndice.toString().padStart(2, '0')}`;
            mesesMap[chaveMes] = (mesesMap[chaveMes] || 0) + 1;
          }

          // 4. Flags Booleanas: Utilização de Frota Auxiliar (Regra de Negócio 2)
          const temApoio = (apoioDois && apoioDois !== '-') || (apoioTres && apoioTres !== '-');
          if (temApoio) {
            frotasAuxMap["Usa Apoio (2ª/3ª)"]++;
          } else {
            frotasAuxMap["Apenas Principal"]++;
          }
        });

        // Formatação dos arrays para os gráficos do Recharts
        setTopPortos(Object.keys(portosMap).map(k => ({ name: k, total: portosMap[k] })).sort((a,b)=>b.total-a.total).slice(0, 5));
        setFrotasUf(Object.keys(ufsMap).map(k => ({ name: k, value: ufsMap[k] })).sort((a,b)=>b.value-a.value).slice(0, 5));
        
        setTempoPorModalidade(Object.keys(modalidadesMap).map(k => ({
          name: k.length > 15 ? k.substring(0, 15) + '...' : k,
          media: parseFloat((modalidadesMap[k].soma / modalidadesMap[k].qtd).toFixed(1))
        })).sort((a,b)=>b.media-a.media).slice(0, 5));

        setUsoAuxiliar(Object.keys(frotasAuxMap).map(k => ({ name: k, value: frotasAuxMap[k] })));
        setSazonalidade(Object.keys(mesesMap).map(k => ({ name: k, viagens: mesesMap[k] })).sort((a,b) => a.name.localeCompare(b.name)).slice(-6));

        setCarregando(false);
      })
      .catch(error => {
        console.error("Erro ao carregar dados do n8n:", error);
        setDados([]); 
        setCarregando(false);
      });
  }, []);

  const CORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', color: '#1a365d' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>⚙️ Conectando com a API do n8n (Via Webhook)...</h2>
          <p style={{ color: '#4a5568' }}>Calculando cubos OLAP e processando ETL em Tempo Real</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #cbd5e1', paddingBottom: '16px' }}>
        <h1 style={{ color: '#1e3a8a', margin: 0 }}>🚢 Painel Estratégico Homologado - Mapas de Bordo (MPA)</h1>
        <p style={{ color: '#475569', margin: '4px 0 0 0' }}>Eduardo Soares, Rafael Rangel, Guilherme Holz, Eduardo Trevizani e Luis Vilarim</p>
      </header>

      {/* Cards KPI */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Ship size={40} color="#0088FE" />
          <div>
            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Volume Total (Fato via n8n)</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#1e293b' }}>{dados.length.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Anchor size={40} color="#00C49F" />
          <div>
            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Porto Principal</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{topPortos[0]?.name || 'N/A'}</p>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Clock size={40} color="#FFBB28" />
          <div>
            <h4 style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Estado Líder da Frota</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>{frotasUf[0]?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos Exigidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        
        {/* REQUISITO 1: Tempo Médio por Modalidade de Pesca */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>⏳ Tempo Médio no Mar por Modalidade (Média em Dias)</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tempoPorModalidade} layout="vertical">
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={110} />
                <Tooltip />
                <Bar dataKey="media" fill="#8884d8" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* REQUISITO 2: Utilização de Frota Auxiliar */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>⚙️ Índice de Utilização de Frotas Auxiliares (Flags Apoio)</h3>
          <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={usoAuxiliar} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {usoAuxiliar.map((entry, idx) => <Cell key={`c-${idx}`} fill={CORES[idx % CORES.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {usoAuxiliar.map((item, idx) => (
                <div key={item.name} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: CORES[idx % CORES.length] }} />
                  <span style={{ fontWeight: '600' }}>{item.name}:</span> {item.value.toLocaleString('pt-BR')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REQUISITO 3: Sazonalidade das Linhas de Pesca */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>📈 Sazonalidade: Histórico Mensal de Viagens (Dimensão Tempo)</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sazonalidade}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="viagens" stroke="#00C49F" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* EXTRA: Distribuição de Portos Homologados */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>⚓ Top 5 Portos de Desembarque Logístico</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPortos}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="total" fill="#0088FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
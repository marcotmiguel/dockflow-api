module.exports = {
  listar: (req, res) => {
    res.status(200).json({ mensagem: 'Listar funcionando com sucesso!' });
  },

  agendar: (req, res) => {
    res.status(200).json({ mensagem: 'Agendamento recebido!' });
  },

  detalhes: (req, res) => {
    const id = req.params.id;
    res.status(200).json({ mensagem: `Detalhes do carregamento ${id}` });
  },

  atualizar: (req, res) => {
    const id = req.params.id;
    res.status(200).json({ mensagem: `Atualização do carregamento ${id}` });
  },

  remover: (req, res) => {
    const id = req.params.id;
    res.status(200).json({ mensagem: `Remoção do carregamento ${id}` });
  }
};

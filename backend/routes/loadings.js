// js/modules/loadings.js

const Loadings = {
  currentQueue: [],
  currentLoading: null,
  scanSound: null,
  
  // Inicializar módulo
  init: function() {
    this.initSound();
    this.loadQueue();
    this.bindEvents();
    this.startAutoRefresh();
  },
  
  // Inicializar som de bipagem
  initSound: function() {
    // Criar som de bipagem
    if (typeof Audio !== 'undefined') {
      this.scanSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hUFApGn+DyvmccBjiR1fAA==');
    }
  },
  
  // Carregar fila de carregamento
  loadQueue: async function() {
    try {
      const data = await Auth.fetchAuth(`${app.API_URL}/loadings/queue`);
      this.currentQueue = data || [];
      this.renderQueue();
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
      this.showAlert('Erro ao carregar fila de carregamento', 'danger');
    }
  },
  
  // Renderizar fila
  renderQueue: function() {
    const container = document.getElementById('queue-container');
    if (!container) return;
    
    if (this.currentQueue.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">Nenhum carregamento na fila</div>';
      return;
    }
    
    const html = this.currentQueue.map(item => this.renderQueueItem(item)).join('');
    container.innerHTML = html;
  },
  
  // Renderizar item da fila
  renderQueueItem: function(item) {
    const statusBadge = this.getStatusBadge(item.status);
    const actionButtons = this.getActionButtons(item);
    
    return `
      <div class="card mb-3 ${item.status === 'loading' ? 'border-primary' : ''}">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-3">
              <h6 class="mb-1">${item.driver_name}</h6>
              <small class="text-muted">CPF: ${this.formatCPF(item.driver_cpf)}</small>
            </div>
            <div class="col-md-2">
              <div class="text-center">
                <i class="fas fa-truck text-primary"></i>
                <div class="small">${item.vehicle_plate}</div>
                <div class="small text-muted">${item.vehicle_type}</div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="text-center">
                <i class="fas fa-route text-info"></i>
                <div class="small">${item.route_code}</div>
                <div class="small text-muted">${item.route_description}</div>
              </div>
            </div>
            <div class="col-md-2">
              ${statusBadge}
              ${item.queue_position ? `<div class="small text-muted mt-1">Posição: ${item.queue_position}</div>` : ''}
              ${item.dock_name ? `<div class="small text-success mt-1"><i class="fas fa-warehouse"></i> ${item.dock_name}</div>` : ''}
            </div>
            <div class="col-md-2">
              <div class="small text-muted">${this.formatDateTime(item.requested_at)}</div>
              ${item.authorized_at ? `<div class="small text-success">Autorizado: ${this.formatDateTime(item.authorized_at)}</div>` : ''}
            </div>
            <div class="col-md-1">
              ${actionButtons}
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  // Obter badge de status
  getStatusBadge: function(status) {
    const badges = {
      'waiting': '<span class="badge bg-warning">Aguardando</span>',
      'approved': '<span class="badge bg-info">Aprovado</span>',
      'loading': '<span class="badge bg-primary">Carregando</span>',
      'completed': '<span class="badge bg-success">Finalizado</span>',
      'cancelled': '<span class="badge bg-danger">Cancelado</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Desconhecido</span>';
  },
  
  // Obter botões de ação
  getActionButtons: function(item) {
    const user = Auth.getUser();
    if (!user) return '';
    
    let buttons = '';
    
    switch (item.status) {
      case 'waiting':
        if (user.role === 'admin' || user.role === 'manager') {
          buttons = `<button class="btn btn-sm btn-success" onclick="Loadings.authorizeLoading(${item.id})">
                      <i class="fas fa-check"></i> Autorizar
                    </button>`;
        }
        break;
      case 'approved':
        buttons = `<button class="btn btn-sm btn-primary" onclick="Loadings.startLoading(${item.id})">
                    <i class="fas fa-play"></i> Iniciar
                  </button>`;
        break;
      case 'loading':
        buttons = `<button class="btn btn-sm btn-info" onclick="Loadings.openScanModal(${item.id})">
                    <i class="fas fa-barcode"></i> Bipar
                  </button>
                  <button class="btn btn-sm btn-warning ms-1" onclick="Loadings.openLoadingDetails(${item.id})">
                    <i class="fas fa-eye"></i> Detalhes
                  </button>`;
        break;
    }
    
    return buttons;
  },
  
  // Bindear eventos
  bindEvents: function() {
    // Event listener para refresh manual
    const refreshBtn = document.getElementById('refresh-queue');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadQueue());
    }
    
    // Event listener para criar nova rota
    const createRouteBtn = document.getElementById('create-route-btn');
    if (createRouteBtn) {
      createRouteBtn.addEventListener('click', () => this.openCreateRouteModal());
    }
    
    // Event listener para importar XML
    const importXmlBtn = document.getElementById('import-xml-btn');
    if (importXmlBtn) {
      importXmlBtn.addEventListener('click', () => this.openImportXmlModal());
    }
  },
  
  // Iniciar auto-refresh
  startAutoRefresh: function() {
    // Atualizar a cada 30 segundos
    setInterval(() => {
      this.loadQueue();
    }, 30000);
  },
  
  // Autorizar carregamento
  authorizeLoading: async function(queueId) {
    try {
      // Buscar docas disponíveis
      const docks = await Auth.fetchAuth(`${app.API_URL}/docks`);
      const availableDocks = docks.filter(dock => dock.status === 'available');
      
      if (availableDocks.length === 0) {
        this.showAlert('Não há docas disponíveis no momento', 'warning');
        return;
      }
      
      // Mostrar modal de seleção de doca
      this.showDockSelectionModal(queueId, availableDocks);
    } catch (error) {
      console.error('Erro ao autorizar carregamento:', error);
      this.showAlert('Erro ao autorizar carregamento', 'danger');
    }
  },
  
  // Mostrar modal de seleção de doca
  showDockSelectionModal: function(queueId, docks) {
    const modalHtml = `
      <div class="modal fade" id="dockSelectionModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Selecionar Doca</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Doca Disponível:</label>
                <select class="form-select" id="dock-selection">
                  ${docks.map(dock => 
                    `<option value="${dock.id}">${dock.name} - ${dock.location}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-success" onclick="Loadings.confirmAuthorization(${queueId})">
                Autorizar Carregamento
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal anterior se existir
    const existingModal = document.getElementById('dockSelectionModal');
    if (existingModal) existingModal.remove();
    
    // Adicionar novo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('dockSelectionModal'));
    modal.show();
  },
  
  // Confirmar autorização
  confirmAuthorization: async function(queueId) {
    try {
      const dockId = document.getElementById('dock-selection').value;
      
      await Auth.fetchAuth(`${app.API_URL}/loadings/queue/${queueId}/authorize`, {
        method: 'POST',
        body: JSON.stringify({ dock_id: parseInt(dockId) })
      });
      
      this.showAlert('Carregamento autorizado com sucesso!', 'success');
      this.loadQueue();
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('dockSelectionModal'));
      modal.hide();
    } catch (error) {
      console.error('Erro ao confirmar autorização:', error);
      this.showAlert('Erro ao autorizar carregamento', 'danger');
    }
  },
  
  // Iniciar carregamento
  startLoading: function(queueId) {
    this.currentLoading = queueId;
    this.openScanModal(queueId);
  },
  
  // Abrir modal de bipagem
  openScanModal: function(queueId) {
    this.currentLoading = queueId;
    
    const modalHtml = `
      <div class="modal fade" id="scanModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-barcode"></i> Bipagem de Itens
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-8">
                  <div class="mb-3">
                    <label class="form-label">Código de Barras:</label>
                    <div class="input-group">
                      <input type="text" class="form-control" id="barcode-input" 
                             placeholder="Escaneie ou digite o código de barras" autofocus>
                      <button class="btn btn-primary" onclick="Loadings.scanItem()">
                        <i class="fas fa-search"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div class="mb-3" id="item-info" style="display:none;">
                    <div class="card bg-light">
                      <div class="card-body">
                        <h6 id="item-name"></h6>
                        <div class="row">
                          <div class="col-6">
                            <small class="text-muted">Código:</small>
                            <div id="item-code"></div>
                          </div>
                          <div class="col-6">
                            <small class="text-muted">Quantidade NF:</small>
                            <div id="item-quantity"></div>
                          </div>
                        </div>
                        <div class="row mt-2">
                          <div class="col-6">
                            <small class="text-muted">Já carregado:</small>
                            <div id="item-loaded" class="text-success"></div>
                          </div>
                          <div class="col-6">
                            <small class="text-muted">Restante:</small>
                            <div id="item-remaining" class="text-warning"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mb-3" id="quantity-input" style="display:none;">
                    <label class="form-label">Quantidade a bipar:</label>
                    <div class="input-group">
                      <input type="number" class="form-control" id="scan-quantity" 
                             step="0.001" min="0.001">
                      <span class="input-group-text" id="item-unit"></span>
                      <button class="btn btn-success" onclick="Loadings.confirmScan()">
                        <i class="fas fa-check"></i> Confirmar
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-4">
                  <h6>Últimas Bipagens:</h6>
                  <div id="recent-scans" class="scan-history">
                    <!-- Histórico será carregado aqui -->
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-warning" onclick="Loadings.checkCompletion()">
                <i class="fas fa-check-circle"></i> Verificar Conclusão
              </button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal anterior se existir
    const existingModal = document.getElementById('scanModal');
    if (existingModal) existingModal.remove();
    
    // Adicionar novo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Event listeners
    document.getElementById('barcode-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.scanItem();
      }
    });
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('scanModal'));
    modal.show();
    
    // Carregar histórico de bipagens
    this.loadRecentScans(queueId);
  },
  
  // Escanear item
  scanItem: async function() {
    const barcode = document.getElementById('barcode-input').value.trim();
    if (!barcode) return;
    
    try {
      // Buscar item pelo código de barras
      const response = await Auth.fetchAuth(
        `${app.API_URL}/loadings/queue/${this.currentLoading}/items?barcode=${barcode}`
      );
      
      if (response.length === 0) {
        this.showAlert('Item não encontrado para este carregamento', 'warning');
        return;
      }
      
      const item = response[0];
      this.showItemInfo(item);
      
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      this.showAlert('Erro ao buscar item', 'danger');
    }
  },
  
  // Mostrar informações do item
  showItemInfo: function(item) {
    document.getElementById('item-name').textContent = item.product_name;
    document.getElementById('item-code').textContent = item.product_code;
    document.getElementById('item-quantity').textContent = `${item.quantity} ${item.unit}`;
    document.getElementById('item-loaded').textContent = `${item.loaded_quantity} ${item.unit}`;
    document.getElementById('item-remaining').textContent = `${item.quantity - item.loaded_quantity} ${item.unit}`;
    document.getElementById('item-unit').textContent = item.unit;
    
    // Definir quantidade padrão (restante)
    document.getElementById('scan-quantity').value = item.quantity - item.loaded_quantity;
    document.getElementById('scan-quantity').max = item.quantity - item.loaded_quantity;
    
    // Mostrar seções
    document.getElementById('item-info').style.display = 'block';
    document.getElementById('quantity-input').style.display = 'block';
    
    // Focar no input de quantidade
    document.getElementById('scan-quantity').focus();
    document.getElementById('scan-quantity').select();
    
    // Armazenar item atual
    this.currentItem = item;
  },
  
  // Confirmar bipagem
  confirmScan: async function() {
    const quantity = parseFloat(document.getElementById('scan-quantity').value);
    const barcode = document.getElementById('barcode-input').value;
    
    if (!quantity || quantity <= 0) {
      this.showAlert('Quantidade inválida', 'warning');
      return;
    }
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/loadings/queue/${this.currentLoading}/scan`, {
        method: 'POST',
        body: JSON.stringify({ barcode, quantity })
      });
      
      // Som de sucesso
      if (this.scanSound) {
        this.scanSound.play().catch(e => console.log('Não foi possível reproduzir som'));
      }
      
      this.showAlert('Item bipado com sucesso!', 'success');
      
      // Limpar campos
      document.getElementById('barcode-input').value = '';
      document.getElementById('item-info').style.display = 'none';
      document.getElementById('quantity-input').style.display = 'none';
      
      // Focar no código de barras
      document.getElementById('barcode-input').focus();
      
      // Atualizar histórico
      this.loadRecentScans(this.currentLoading);
      
      // Atualizar fila
      this.loadQueue();
      
    } catch (error) {
      console.error('Erro ao bipar item:', error);
      this.showAlert(error.message || 'Erro ao bipar item', 'danger');
    }
  },
  
  // Carregar bipagens recentes
  loadRecentScans: async function(queueId) {
    try {
      const scans = await Auth.fetchAuth(`${app.API_URL}/loadings/queue/${queueId}/scans`);
      
      const container = document.getElementById('recent-scans');
      if (!container) return;
      
      if (scans.length === 0) {
        container.innerHTML = '<div class="text-muted small">Nenhuma bipagem ainda</div>';
        return;
      }
      
      const html = scans.slice(-5).reverse().map(scan => `
        <div class="scan-item mb-2 p-2 bg-light rounded">
          <div class="small fw-bold">${scan.product_name}</div>
          <div class="small text-muted">${scan.scanned_quantity} ${scan.unit}</div>
          <div class="small text-muted">${this.formatDateTime(scan.scanned_at)}</div>
        </div>
      `).join('');
      
      container.innerHTML = html;
    } catch (error) {
      console.error('Erro ao carregar bipagens:', error);
    }
  },
  
  // Verificar conclusão do carregamento
  checkCompletion: async function() {
    try {
      const response = await Auth.fetchAuth(
        `${app.API_URL}/loadings/queue/${this.currentLoading}/completion-status`
      );
      
      if (response.completed) {
        const confirmComplete = confirm('Todos os itens foram bipados. Finalizar carregamento?');
        if (confirmComplete) {
          await this.completeLoading();
        }
      } else {
        this.showAlert(`Ainda há ${response.pending_items} item(s) pendente(s)`, 'info');
      }
    } catch (error) {
      console.error('Erro ao verificar conclusão:', error);
      this.showAlert('Erro ao verificar conclusão', 'danger');
    }
  },
  
  // Finalizar carregamento
  completeLoading: async function() {
    try {
      await Auth.fetchAuth(`${app.API_URL}/loadings/queue/${this.currentLoading}/complete`, {
        method: 'POST'
      });
      
      this.showAlert('Carregamento finalizado com sucesso!', 'success');
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('scanModal'));
      if (modal) modal.hide();
      
      // Atualizar fila
      this.loadQueue();
      
    } catch (error) {
      console.error('Erro ao finalizar carregamento:', error);
      this.showAlert(error.message || 'Erro ao finalizar carregamento', 'danger');
    }
  },
  
  // Abrir detalhes do carregamento
  openLoadingDetails: function(queueId) {
    // Implementar modal de detalhes completo
    console.log('Abrir detalhes do carregamento:', queueId);
  },
  
  // Formatadores auxiliares
  formatCPF: function(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },
  
  formatDateTime: function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  },
  
  // Mostrar alert
  showAlert: function(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container') || document.body;
    
    const alertHtml = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    
    alertContainer.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
      const alert = alertContainer.querySelector('.alert');
      if (alert) {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      }
    }, 5000);
  }
};
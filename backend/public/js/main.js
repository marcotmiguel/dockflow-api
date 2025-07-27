// js/main.js

// Configuração da aplicação
const app = {
  currentPage: '',
API_URL: window.API_URL || 'http://localhost:3000/api',
  
  // Inicializar a aplicação
  init: function() {
    // Verificar autenticação em páginas protegidas
    if (!Auth.isAuthenticated() && !window.location.pathname.includes('index.html')) {
      Auth.logout();
      return;
    }
    
    // Inicializar componentes de navegação
    this.initNavigation();
    
    // Carregar página inicial se estiver no dashboard
    if (document.getElementById('dashboard-container')) {
      this.loadPage('dashboard');
    }
  },
  
  // Inicializar navegação
  initNavigation: function() {
    // Adicionar event listener para links de navegação
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        this.loadPage(page);
        
        // Atualizar link ativo
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
    
    // Configurar logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
    
    // Exibir nome do usuário
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      const user = Auth.getUser();
      if (user) {
        userNameElement.textContent = user.name;
      }
    }
    
    // Esconder elementos baseados em permissões
    this.updateUIBasedOnPermissions();
  },
  
  // Atualizar elementos de UI baseado em permissões
  updateUIBasedOnPermissions: function() {
    const user = Auth.getUser();
    
    if (!user) return;
    
    // Esconder elementos que requerem permissão de admin
    const adminElements = document.querySelectorAll('[data-role="admin"]');
    adminElements.forEach(el => {
      if (user.role !== 'admin') {
        el.classList.add('d-none');
      }
    });
    
    // Esconder elementos que requerem permissão de gerente
    const managerElements = document.querySelectorAll('[data-role="manager"]');
    managerElements.forEach(el => {
      if (user.role !== 'admin' && user.role !== 'manager') {
        el.classList.add('d-none');
      }
    });
  },
  
  // Carregar página
  loadPage: function(page) {
    // Se for a mesma página, não recarregar
    if (page === this.currentPage) return;
    
    this.currentPage = page;
    
    // Mostrar loader
    const contentContainer = document.getElementById('content-container');
    if (contentContainer) {
      contentContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
    }
    
    // Atualizar título
    this.updatePageTitle(page);
    
    // Carregar conteúdo da página
    fetch(`${window.location.origin}/pages/${page === 'dashboard' ? 'dashboard-content' : page}.html`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Página não encontrada');
        }
        return response.text();
      })
      .then(html => {
        if (contentContainer) {
          // Para a página de dashboard, usar o HTML diretamente
          if (page === 'dashboard') {
            contentContainer.innerHTML = html;
          } else {
            // Para outras páginas, criar um elemento temporário para processar o HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Extrair conteúdo principal
            let pageContent = tempDiv.querySelector('.content-page');
            if (!pageContent) pageContent = tempDiv.querySelector('main');
            
            if (pageContent) {
              // Inserir o conteúdo principal
              contentContainer.innerHTML = pageContent.outerHTML;
              
              // LIMPAR MODAIS ANTIGOS PRIMEIRO
              const existingModals = document.querySelectorAll('.modal');
              existingModals.forEach(modal => {
                if (modal.id.includes('driver') || modal.id.includes('vehicle') || modal.id.includes('dock') || modal.id.includes('createRoute') || modal.id.includes('importXml') || modal.id.includes('manageLoading')) {
                  modal.remove();
                }
              });
              
              // Inserir modais no body (fora do container)
              const modals = tempDiv.querySelectorAll('.modal');
              modals.forEach(modal => {
                // Adicionar novo modal ao body
                document.body.appendChild(modal.cloneNode(true));
              });
            } else {
              // Se não encontrar, usar todo o HTML
              contentContainer.innerHTML = html;
            }
          }
          
          // Inicializar a página específica
          this.initSpecificPage(page);
        }
      })
      .catch(error => {
        console.error('Erro ao carregar página:', error);
        if (contentContainer) {
          contentContainer.innerHTML = `<div class="alert alert-danger">Erro ao carregar página: ${error.message}</div>`;
        }
      });
  },
  
  // Atualizar título da página
  updatePageTitle: function(page) {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      const titles = {
        'dashboard': 'Dashboard',
        'docks': 'Gerenciamento de Docas',
        'loadings': 'Carregamentos',
        'products': 'Produtos',
        'drivers': 'Motoristas',
        'vehicles': 'Veículos',
        'users': 'Usuários',
        'reports': 'Relatórios'
      };
      
      pageTitle.textContent = titles[page] || 'DockFlow';
    }
  },
  
  // Inicializar página específica
  initSpecificPage: function(page) {
    switch (page) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined') {
          Dashboard.init();
        }
        break;
      case 'drivers':
        if (typeof Drivers !== 'undefined') {
          Drivers.init();
        }
        break;
      case 'vehicles':
        if (typeof Vehicles !== 'undefined') {
          Vehicles.init();
        }
        break;
      case 'docks':
        if (typeof Docks !== 'undefined') {
          Docks.init();
        }
        break;
      case 'users':
        if (typeof Users !== 'undefined') {
          Users.init();
        }
        break;
      case 'loadings':
        this.initLoadings();
        break;
      case 'products':
        this.initProducts();
        break;
      case 'xml-import':
      if (typeof XmlImport !== 'undefined') {
       XmlImport.init();
  }
  break;
    }
  },
  
  // 🔧 NOVA FUNÇÃO: Carregar módulos de carregamentos em sequência
loadLoadingsModules: function() {
  // 📡 PRIMEIRO: Carregar API de rotas
  return import('./api/routes-api.js').then(() => {
    console.log('✅ API de rotas carregada');
    
    const modules = [
  'smart-restrictions-parser.js',      // 🧠 Parser primeiro
  'restrictions-ui-enhancer.js',       // 🎨 Interface depois
  'loadings-core.js',
  'loadings-docks.js',
  'loadings-routes.js',
  'loadings-scanning.js',
  'loadings-xml.js',                   // 📁 XML por último para integração
  'loadings-routing.js',
  'loadings-history.js',
  'loadings.js'
];
    
    return this.loadScriptsSequentially(modules, '../js/modules/');
  }).catch(error => {
    console.warn('⚠️ API de rotas não encontrada, usando fallback local:', error);
    
    const modules = [
      'loadings-core.js',
      'loadings-docks.js',
      'loadings-routes.js', 
      'loadings-scanning.js',
      'loadings-xml.js',
      'loadings-routing.js',
      'loadings-history.js',
      'loadings.js'
    ];
    
    return this.loadScriptsSequentially(modules, '../js/modules/');
  });
},
  
  // 🔄 Carregar scripts em sequência
  loadScriptsSequentially: function(scripts, basePath) {
    return scripts.reduce((promise, script) => {
      return promise.then(() => {
        return new Promise((resolve, reject) => {
          // Verificar se módulo já está carregado
          const moduleName = this.getModuleNameFromScript(script);
          if (moduleName && typeof window[moduleName] !== 'undefined') {
            console.log(`✅ Módulo ${script} já carregado`);
            resolve();
            return;
          }
          
          console.log(`📁 Carregando módulo: ${script}`);
          
          const scriptElement = document.createElement('script');
          scriptElement.src = basePath + script;
          scriptElement.onload = () => {
            console.log(`✅ Módulo carregado: ${script}`);
            
            // Verificação adicional
            setTimeout(() => {
              if (this.verifyModuleLoaded(script)) {
                resolve();
              } else {
                console.warn(`⚠️ Módulo ${script} carregado mas não exposto globalmente`);
                resolve(); // Continuar mesmo assim
              }
            }, 100);
          };
          scriptElement.onerror = () => {
            console.error(`❌ Erro ao carregar: ${script}`);
            reject(new Error(`Falha ao carregar ${script}`));
          };
          document.head.appendChild(scriptElement);
        });
      });
    }, Promise.resolve());
  },

  // 🔍 Obter nome do módulo pelo arquivo
  getModuleNameFromScript: function(scriptFile) {
    const moduleMap = {
      'loadings-core.js': 'LoadingsCore',
      'loadings-docks.js': 'LoadingsDocks', 
      'loadings-routes.js': 'LoadingsRoutes',
      'loadings-scanning.js': 'LoadingsScanning',
      'loadings-xml.js': 'LoadingsXML',
      'loadings-routing.js': 'LoadingsRouting',
      'loadings-history.js': 'LoadingsHistory',
      'loadings.js': 'Loadings'
    };
    return moduleMap[scriptFile];
  },

  // 🔧 Verificação adicional após carregamento
  verifyModuleLoaded: function(scriptFile) {
    const moduleName = this.getModuleNameFromScript(scriptFile);
    if (moduleName) {
      const isLoaded = typeof window[moduleName] !== 'undefined';
      console.log(`🔍 Verificando ${moduleName}:`, isLoaded ? '✅' : '❌');
      return isLoaded;
    }
    return true;
  },
  
  // Função para carregar módulo de carregamentos
  initLoadings: function() {
    const contentContainer = document.getElementById('content-container');
    
    // Verificar se todos os módulos estão carregados
    const requiredModules = ['LoadingsCore', 'LoadingsXML', 'LoadingsDocks', 'LoadingsScanning', 'LoadingsRoutes', 'LoadingsRouting', 'LoadingsHistory'];
    const missingModules = requiredModules.filter(module => typeof window[module] === 'undefined');
    
    if (missingModules.length > 0 || typeof Loadings === 'undefined') {
      console.log('🔧 Carregando módulos de carregamentos...');
      console.log('📋 Módulos faltando:', missingModules);
      
      // Mostrar loading específico
      if (contentContainer) {
        contentContainer.innerHTML = `
          <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Carregando módulos...</span>
            </div>
            <h5>Carregando Sistema de Carregamentos</h5>
            <p class="text-muted">Inicializando módulos...</p>
            <small class="text-muted">Faltando: ${missingModules.join(', ')}</small>
          </div>
        `;
      }
      
      // Carregar todos os módulos em sequência
      this.loadLoadingsModules()
        .then(() => {
          console.log('✅ Todos os módulos de carregamentos carregados');
          // Verificar novamente se todos estão carregados
          const stillMissing = requiredModules.filter(module => typeof window[module] === 'undefined');
          if (stillMissing.length > 0) {
            console.warn('⚠️ Alguns módulos ainda estão faltando:', stillMissing);
          }
          this.loadLoadingsPage(contentContainer);
        })
        .catch(error => {
          console.error('❌ Erro ao carregar módulos:', error);
          if (contentContainer) {
            contentContainer.innerHTML = `
              <div class="alert alert-danger">
                <h5>Erro ao carregar módulos</h5>
                <p>${error.message}</p>
                <p><strong>Módulos faltando:</strong> ${missingModules.join(', ')}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                  <i class="fas fa-refresh me-2"></i>Recarregar Página
                </button>
              </div>
            `;
          }
        });
    } else {
      // Módulos já carregados
      console.log('✅ Módulos já carregados, inicializando página...');
      this.loadLoadingsPage(contentContainer);
    }
  },
  
  // Carregar página de carregamentos
  loadLoadingsPage: function(contentContainer) {
    console.log('📄 Carregando página de carregamentos...');
    
    // Carregar a página HTML primeiro, depois inicializar o módulo
    fetch(`${window.location.origin}/pages/loadings.html`)
      .then(response => response.text())
      .then(html => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const pageContent = tempDiv.querySelector('.content-page');
        
        if (pageContent && contentContainer) {
          contentContainer.innerHTML = pageContent.outerHTML;
          
          // Limpar modais antigos de carregamentos
          const existingLoadingModals = document.querySelectorAll('.modal[id*="Route"], .modal[id*="Xml"], .modal[id*="Loading"]');
          existingLoadingModals.forEach(modal => modal.remove());
          
          // Inserir modais no body
          const modals = tempDiv.querySelectorAll('.modal');
          modals.forEach(modal => {
            document.body.appendChild(modal.cloneNode(true));
          });
          
          // Inicializar módulo após carregar HTML
          setTimeout(() => {
            if (typeof Loadings !== 'undefined') {
              console.log('🚀 Inicializando sistema DockFlow...');
              Loadings.init();
              console.log('✅ Sistema DockFlow inicializado com sucesso!');
            } else {
              console.error('❌ Módulo Loadings ainda não está definido');
              if (contentContainer) {
                contentContainer.innerHTML = `
                  <div class="alert alert-warning">
                    <h5>Módulo não carregado</h5>
                    <p>O sistema não foi carregado corretamente.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                      <i class="fas fa-refresh me-2"></i>Recarregar Página
                    </button>
                  </div>
                `;
              }
            }
          }, 200);
        }
      })
      .catch(error => {
        console.error('Erro ao carregar loadings.html:', error);
        if (contentContainer) {
          contentContainer.innerHTML = `
            <div class="alert alert-danger">
              <h5>Erro ao carregar página</h5>
              <p>${error.message}</p>
              <button class="btn btn-primary" onclick="location.reload()">
                <i class="fas fa-refresh me-2"></i>Recarregar Página
              </button>
            </div>
          `;
        }
      });
  },
  
  // Placeholder para módulo de produtos
  initProducts: function() {
    document.getElementById('content-container').innerHTML = '<p class="text-center text-muted py-5">Módulo de Produtos em desenvolvimento.</p>';
  },
  
  // Método helper para mostrar carregamento (usado pelos módulos)
  viewLoading: function(loadingId) {
    this.loadPage('loadings');
    // Lógica para mostrar detalhes do carregamento específico
    console.log('Visualizar carregamento:', loadingId);
  }
};

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  app.init();
});
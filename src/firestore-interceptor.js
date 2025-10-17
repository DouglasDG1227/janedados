// firestore-interceptor.js
// Este script intercepta as chamadas de localStorage para persistir os dados no Firestore.

// Credenciais do Firebase fornecidas pelo usuário
const firebaseConfig = {
    apiKey: "AIzaSyC_MRn_N4oPwVKAMqSau80eI_9eGHe8c6o",
    authDomain: "site-da-jane.firebaseapp.com",
    projectId: "site-da-jane",
    storageBucket: "site-da-jane.firebasestorage.app",
    messagingSenderId: "288428308543",
    appId: "1:288428308543:web:d65ab1a6228f4b5ef9e08a",
    measurementId: "G-94SYD1QVYP"
};

// Chave do localStorage que o site usa (identificada na análise)
const PRODUCTS_KEY = "jane_souza_imoveis_products";
const PRODUCTS_COLLECTION = "imoveis";

// Dados iniciais de imóveis (mock data original)
const INITIAL_PRODUCTS = [
    {id:1,name:"Apartamento Moderno - Vila Mariana",description:"Apartamento de 2 quartos com suíte, sala ampla, cozinha planejada e 1 vaga de garagem.",image:"/property1-SR8rBSO4.jpg",price:"A partir de R$ 450.000,00",basePrice:450000,available:true},
    {id:2,name:"Casa Térrea - Jardim Paulista",description:"Casa com 3 quartos, quintal espaçoso, churrasqueira e 2 vagas de garagem.",image:"/property2-C6pirZNW.jpg",price:"A partir de R$ 850.000,00",basePrice:850000,available:true},
    {id:3,name:"Cobertura Duplex - Moema",description:"Cobertura de luxo com 4 suítes, terraço com piscina, churrasqueira e 3 vagas.",image:"/interior1-u4LSGBkX.jpg",price:"A partir de R$ 1.200.000,00",basePrice:1200000,available:true},
    {id:4,name:"Studio Compacto - Pinheiros",description:"Studio moderno e funcional, ideal para solteiros ou investimento, com 1 vaga.",image:"/interior2-CgYWxnBj.jpg",price:"A partir de R$ 280.000,00",basePrice:280000,available:true},
    {id:5,name:"Sobrado - Brooklin",description:"Sobrado com 3 suítes, sala de estar e jantar, cozinha gourmet e 2 vagas.",image:"/property1-SR8rBSO4.jpg",price:"A partir de R$ 950.000,00",basePrice:950000,available:true},
    {id:6,name:"Apartamento Compacto - Itaim Bibi",description:"Apartamento de 1 quarto, sala integrada, cozinha americana e 1 vaga.",image:"/property2-C6pirZNW.jpg",price:"A partir de R$ 380.000,00",basePrice:380000,available:true}
];

// Inicializa o Firebase
if (typeof firebase !== 'undefined' && typeof firebase.firestore !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    /**
     * Função utilitária para formatar o objeto de imóvel.
     */
    const formatProductForFirestore = (product) => {
        const id = String(product.id);
        const { id: _, ...data } = product;
        return { id, data: { ...data, id: product.id } };
    };

    /**
     * Popula o Firestore com os dados iniciais se a coleção estiver vazia.
     */
    async function populateInitialData() {
        try {
            const collectionRef = db.collection(PRODUCTS_COLLECTION);
            const snapshot = await collectionRef.get();

            if (snapshot.empty) {
                console.log("Interceptor: Coleção vazia. Populando com dados iniciais...");
                const batch = db.batch();
                INITIAL_PRODUCTS.forEach((product) => {
                    const { id, data } = formatProductForFirestore(product);
                    batch.set(collectionRef.doc(id), data);
                });
                await batch.commit();
                console.log("Interceptor: Dados iniciais populados com sucesso.");
                return INITIAL_PRODUCTS;
            }
            return null;
        } catch (error) {
            console.error("Interceptor: Erro ao popular dados iniciais:", error);
            return null;
        }
    }

    /**
     * Carrega todos os imóveis do Firestore.
     */
    async function loadProductsFromFirestore() {
        try {
            const products = [];
            const collectionRef = db.collection(PRODUCTS_COLLECTION);
            const snapshot = await collectionRef.orderBy("id").get();

            if (snapshot.empty) {
                const initialData = await populateInitialData();
                if (initialData) return initialData;
            }

            snapshot.forEach((doc) => {
                products.push(doc.data());
            });

            return products.map(p => ({ ...p, id: Number(p.id) }));
        } catch (error) {
            console.error("Interceptor: Erro ao carregar imóveis do Firestore:", error);
            return INITIAL_PRODUCTS;
        }
    }

    /**
     * Salva um array completo de produtos no Firestore.
     */
    async function saveAllProductsToFirestore(products) {
        try {
            const collectionRef = db.collection(PRODUCTS_COLLECTION);
            await db.runTransaction(async (transaction) => {
                const existingDocs = await transaction.get(collectionRef);
                const existingIds = existingDocs.docs.map(doc => doc.id);
                const newIds = products.map(p => String(p.id));

                // 1. Deleta documentos que não estão mais no array (exclusão)
                existingIds.forEach((id) => {
                    if (!newIds.includes(id)) {
                        transaction.delete(collectionRef.doc(id));
                    }
                });

                // 2. Adiciona ou atualiza documentos
                products.forEach((product) => {
                    const { id, data } = formatProductForFirestore(product);
                    transaction.set(collectionRef.doc(id), data);
                });
            });
            console.log("Interceptor: Produtos salvos no Firestore com sucesso.");
            return true;
        } catch (error) {
            console.error("Interceptor: Erro ao salvar produtos no Firestore:", error);
            return false;
        }
    }

    // --- Interceptação do localStorage ---
    const originalLocalStorage = window.localStorage;

    // Cria um objeto proxy para o localStorage
    const localStorageProxy = {
        getItem: function(key) {
            if (key === PRODUCTS_KEY) {
                // Tenta carregar do Firestore. Se falhar, usa o localStorage original como fallback.
                // Como a função é assíncrona, precisamos de um mecanismo de bloqueio ou sincronização.
                // Para não bloquear a thread principal, vamos usar um hack:
                // O site espera um valor síncrono. Vamos retornar o valor do localStorage original
                // E, em paralelo, carregar o do Firestore e injetar no localStorage.
                
                // Se já tivermos a flag de que o Firestore carregou, usamos o valor do localStorage (que foi injetado)
                if (originalLocalStorage.getItem('firestore_loaded')) {
                    return originalLocalStorage.getItem(key);
                }

                // Primeira carga: Retorna o valor original (mock ou o que estiver no cache)
                const initialValue = originalLocalStorage.getItem(key) || JSON.stringify(INITIAL_PRODUCTS);
                
                // Inicia a carga do Firestore em segundo plano
                loadProductsFromFirestore().then(products => {
                    // Quando o Firestore carregar, injeta no localStorage e dispara um evento
                    originalLocalStorage.setItem(key, JSON.stringify(products));
                    originalLocalStorage.setItem('firestore_loaded', 'true');
                    
                    // Dispara um evento customizado para o React recarregar (se o código React estiver ouvindo)
                    // Como não temos acesso ao código React, isso é um chute.
                    const event = new Event('storage');
                    event.key = key;
                    event.newValue = JSON.stringify(products);
                    window.dispatchEvent(event);
                    
                    console.log("Interceptor: Dados do Firestore carregados e injetados no localStorage.");
                }).catch(error => {
                    console.error("Interceptor: Falha ao carregar do Firestore, mantendo dados locais.", error);
                    originalLocalStorage.setItem('firestore_loaded', 'true'); // Marca como "tentado"
                });

                return initialValue;
            }
            return originalLocalStorage.getItem(key);
        },

        setItem: function(key, value) {
            if (key === PRODUCTS_KEY) {
                // Intercepta a escrita: salva no Firestore.
                try {
                    const products = JSON.parse(value);
                    saveAllProductsToFirestore(products);
                    
                    // Salva no localStorage original para que as próximas leituras síncronas usem o valor mais recente
                    originalLocalStorage.setItem(key, value);
                    console.log("Interceptor: Escrita interceptada e enviada para o Firestore.");
                } catch (e) {
                    console.error("Interceptor: Erro ao processar dados para salvar no Firestore.", e);
                    originalLocalStorage.setItem(key, value); // Fallback
                }
                return;
            }
            originalLocalStorage.setItem(key, value);
        },
        
        // Outras funções do localStorage
        removeItem: function(key) {
            if (key === PRODUCTS_KEY) {
                 // Para simplificar, a função saveAllProductsToFirestore já lida com exclusões
                 // Ao receber uma lista menor, ela deleta o que não existe mais.
                 // Então, apenas limpamos o local storage e o saveAllProductsToFirestore fará o resto.
                 originalLocalStorage.removeItem(key);
                 console.log("Interceptor: Remoção interceptada (o Firestore será atualizado na próxima escrita).");
                 return;
            }
            originalLocalStorage.removeItem(key);
        },
        clear: function() {
            originalLocalStorage.clear();
        },
        key: function(index) {
            return originalLocalStorage.key(index);
        },
        length: originalLocalStorage.length
    };

    // Substitui o objeto localStorage global
    Object.defineProperty(window, 'localStorage', {
        value: localStorageProxy,
        writable: false,
        configurable: true
    });

    console.log("Interceptor: localStorage substituído com sucesso.");

} else {
    console.error("Interceptor: Firebase SDK não carregado. Verifique as tags <script> no HTML.");
}

// Configuração do Firebase para uso via CDN e script global

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

// Dados iniciais de imóveis (mock data original)
const INITIAL_PRODUCTS = [
  {id:1,name:"Apartamento Moderno - Vila Mariana",description:"Apartamento de 2 quartos com suíte, sala ampla, cozinha planejada e 1 vaga de garagem.",image:"/property1-SR8rBSO4.jpg",price:"A partir de R$ 450.000,00",basePrice:450000,available:true},
  {id:2,name:"Casa Térrea - Jardim Paulista",description:"Casa com 3 quartos, quintal espaçoso, churrasqueira e 2 vagas de garagem.",image:"/property2-C6pirZNW.jpg",price:"A partir de R$ 850.000,00",basePrice:850000,available:true},
  {id:3,name:"Cobertura Duplex - Moema",description:"Cobertura de luxo com 4 suítes, terraço com piscina, churrasqueira e 3 vagas.",image:"/interior1-u4LSGBkX.jpg",price:"A partir de R$ 1.200.000,00",basePrice:1200000,available:true},
  {id:4,name:"Studio Compacto - Pinheiros",description:"Studio moderno e funcional, ideal para solteiros ou investimento, com 1 vaga.",image:"/interior2-CgYWxnBj.jpg",price:"A partir de R$ 280.000,00",basePrice:280000,available:true},
  {id:5,name:"Sobrado - Brooklin",description:"Sobrado com 3 suítes, sala de estar e jantar, cozinha gourmet e 2 vagas.",image:"/property1-SR8rBSO4.jpg",price:"A partir de R$ 950.000,00",basePrice:950000,available:true},
  {id:6,name:"Apartamento Compacto - Itaim Bibi",description:"Apartamento de 1 quarto, sala integrada, cozinha americana e 1 vaga.",image:"/property2-C6pirZNW.jpg",price:"A partir de R$ 380.000,00",basePrice:380000,available:true}
];

// Inicializa o Firebase (assumindo que as bibliotecas CDN já foram carregadas)
// Verifica se 'firebase' está disponível (carregado via CDN)
if (typeof firebase !== 'undefined') {
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const PRODUCTS_COLLECTION = "imoveis";

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
                console.log("Coleção vazia. Populando com dados iniciais...");
                const batch = db.batch();
                INITIAL_PRODUCTS.forEach((product) => {
                    const { id, data } = formatProductForFirestore(product);
                    batch.set(collectionRef.doc(id), data);
                });
                await batch.commit();
                console.log("Dados iniciais populados com sucesso.");
                return INITIAL_PRODUCTS;
            }
            return null;
        } catch (error) {
            console.error("Erro ao popular dados iniciais:", error);
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
            console.error("Erro ao carregar imóveis do Firestore:", error);
            return INITIAL_PRODUCTS;
        }
    }

    /**
     * Salva um array completo de produtos no Firestore (usado para o painel admin).
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
            console.log("Produtos salvos no Firestore com sucesso.");
            return true;
        } catch (error) {
            console.error("Erro ao salvar produtos no Firestore:", error);
            return false;
        }
    }

    // Expõe as funções globalmente para o código minificado poder acessá-las
    window.loadProductsFromFirestore = loadProductsFromFirestore;
    window.saveAllProductsToFirestore = saveAllProductsToFirestore;
} else {
    console.error("Firebase SDK não carregado. Verifique as tags <script> no HTML.");
}

window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;

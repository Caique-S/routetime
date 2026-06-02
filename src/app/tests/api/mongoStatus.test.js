describe ("API Status do MongoDB api/mongostats", () => {

    let response;
    let body;

    beforeAll(async () => {
        response = await fetch('http://localhost:3000/api/mongostats')
        body = await response.json()
        console.dir(body, { depth: null })
    })
    
    test("Retorno de conexão esperado 200", () => {
        expect(response.status).toBe(200)
    })
    
    test("Retorno de Data no formato Correto", () => {
        expect(body).toHaveProperty('updated_at')
        // Garante que a estrutura do texto segue o padrão de data do JSON
        expect(body.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    })
    
    test("Retorno da Versão do Banco", () => {
        //Versão do Banco 0.
        expect(body).toHaveProperty('dependencies.database.version');
        // 1. Garante que a versão existe e é uma string
        const version = body.dependencies.database.version
        expect(typeof version).toBe('string');
        // 2. Garante que ela não está vazia
        expect(version.length).toBeGreaterThan(0);
        // 3. Regex valida: número(s) + ponto + número(s) + ponto + número(s)
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    })

    test("Retorno das métricas de conexões válidas" , () => {
        // 0. Verifica se está retornando os valores do Objeto  
        expect(body).toHaveProperty('dependencies.database.connections.current');
        expect(body).toHaveProperty('dependencies.database.connections.available');
        expect(body).toHaveProperty('dependencies.database.connections.totalCreated');
        const connections = body.dependencies.database.connections;
        // 1. Validações de tipo e integridade
        expect(Number.isInteger(connections.current)).toBe(true);
        expect(Number.isInteger(connections.available)).toBe(true);
        expect(Number.isInteger(connections.totalCreated)).toBe(true);
        expect(connections.current).toBeGreaterThanOrEqual(0);
        expect(connections.available).toBeGreaterThanOrEqual(0);
        expect(connections.totalCreated).toBeGreaterThanOrEqual(0);
        // 2. Validação da regra de infraestrutura do plano gratuito
        const totalConnections = connections.current + connections.available;
        expect(totalConnections).toBe(500);
    })
})

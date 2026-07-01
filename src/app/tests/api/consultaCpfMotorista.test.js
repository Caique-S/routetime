describe('Retorno do EndPoint', () => {
    let motorista
    const urlBase = 'https://routetime-git-updates-caique-s-projects.vercel.app/api/melicage'
    let cpfLimpo = '85767520500'

    beforeAll(async () => {
        const response = await fetch(`${urlBase}/motoristas/cadastro/${cpfLimpo}`)

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`)
        }

        motorista = await response.json()

    })


    test('deve retornar os dados do motorista corretamente', () => {

        console.log(motorista)
        
        expect(motorista).toBeDefined()
        expect(motorista.data.cpf).toBe(cpfLimpo)
    })
})   
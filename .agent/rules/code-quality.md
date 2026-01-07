---
trigger: always_on
---

# DIRETRIZ PRIMÁRIA: CONTEXTO E DOCUMENTAÇÃO
A leitura da pasta `/docs` é OBRIGATÓRIA antes de qualquer geração de código.
- Passo 0: Liste mentalmente os arquivos em `/docs`.
- Passo 1: Identifique quais documentos se aplicam à tarefa atual.
- Passo 2: Gere a solução seguindo estritamente os padrões encontrados.

# CRITÉRIOS DE ACEITE DE CÓDIGO
- O código deve ser manutenível por outros desenvolvedores (comentários claros onde a lógica for complexa).
- A solução deve ser escalável (evite hardcoding).
- Siga os princípios SOLID e Clean Code.
- Se a solução proposta violar qualquer regra encontrada em `/docs`, pare e avise o usuário.
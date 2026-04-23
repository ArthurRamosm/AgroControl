using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class RegisterPropriedadeDto
{
    [Required(ErrorMessage = "Nome da propriedade é obrigatório")]
    [MaxLength(100, ErrorMessage = "Nome da propriedade pode ter no máximo 100 caracteres")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "Cidade é obrigatória")]
    [MaxLength(100, ErrorMessage = "Cidade pode ter no máximo 100 caracteres")]
    public string Cidade { get; set; } = string.Empty;

    [Required(ErrorMessage = "Estado é obrigatório")]
    [StringLength(2, MinimumLength = 2, ErrorMessage = "Estado deve ser a sigla com 2 letras (ex: SP)")]
    public string Estado { get; set; } = string.Empty;
}

public class RegisterRequestDto
{
    [Required(ErrorMessage = "Nome completo é obrigatório")]
    [MaxLength(100, ErrorMessage = "Nome pode ter no máximo 100 caracteres")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "E-mail é obrigatório")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido")]
    [MaxLength(150, ErrorMessage = "E-mail pode ter no máximo 150 caracteres")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Usuário é obrigatório")]
    [MaxLength(50, ErrorMessage = "Usuário pode ter no máximo 50 caracteres")]
    [RegularExpression(@"^[a-zA-Z0-9_]+$",
        ErrorMessage = "Usuário só pode conter letras, números e underscore (sem espaços ou caracteres especiais)")]
    public string Usuario { get; set; } = string.Empty;

    [Required(ErrorMessage = "Senha é obrigatória")]
    [MinLength(4, ErrorMessage = "Senha deve ter pelo menos 4 caracteres")]
    public string Senha { get; set; } = string.Empty;

    [Required(ErrorMessage = "Dados da propriedade são obrigatórios")]
    public RegisterPropriedadeDto Propriedade { get; set; } = null!;
}

public class RegisterResponseDto
{
    public bool Sucesso { get; set; }
    public string? Mensagem { get; set; }
}

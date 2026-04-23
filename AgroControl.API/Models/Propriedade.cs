namespace AgroControl.API.Models;

public class Propriedade
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Cidade { get; set; }
    public string? Estado { get; set; }

    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}

using Microsoft.EntityFrameworkCore;
using AgroControl.API.Models;

namespace AgroControl.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Propriedade> Propriedades { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Animal> Animais { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Propriedade>(e =>
        {
            e.ToTable("PROPRIEDADE");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.Nome).HasColumnName("nome").HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("USUARIO");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id");
            e.Property(u => u.NomeUsuario).HasColumnName("usuario").HasMaxLength(50).IsRequired();
            e.Property(u => u.Senha).HasColumnName("senha").HasMaxLength(255).IsRequired();
            e.Property(u => u.PropriedadeId).HasColumnName("propriedade_id");

            e.HasOne(u => u.Propriedade)
             .WithMany(p => p.Usuarios)
             .HasForeignKey(u => u.PropriedadeId);
        });

        modelBuilder.Entity<Animal>(e =>
        {
            e.ToTable("ANIMAL");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.Brinco).HasColumnName("brinco").HasMaxLength(20).IsRequired();
            e.Property(a => a.Nome).HasColumnName("nome").HasMaxLength(100);
            e.Property(a => a.Raca).HasColumnName("raca").HasMaxLength(50).IsRequired();
            e.Property(a => a.Sexo).HasColumnName("sexo").HasMaxLength(1).IsRequired();
            e.Property(a => a.Tipo).HasColumnName("tipo").HasMaxLength(50).IsRequired();
            e.Property(a => a.StatusLeite).HasColumnName("status_leite").HasMaxLength(30);
            e.Property(a => a.Ativo).HasColumnName("ativo");
            e.Property(a => a.PropriedadeId).HasColumnName("propriedade_id");

            e.HasOne(a => a.Propriedade)
             .WithMany()
             .HasForeignKey(a => a.PropriedadeId);
        });
    }
}

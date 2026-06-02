using Microsoft.EntityFrameworkCore;
using AgroControl.API.Models;

namespace AgroControl.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Propriedade> Propriedades { get; set; }
    public DbSet<PropriedadeArea> PropriedadeAreas { get; set; }
    public DbSet<PropriedadePonto> PropriedadePontos { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Animal> Animais { get; set; }
    public DbSet<AnimalFoto> AnimalFotos { get; set; }
    public DbSet<AnimalEvento> AnimalEventos { get; set; }
    public DbSet<AnimalLactacao> AnimalLactacoes { get; set; }
    public DbSet<AnimalVacina> AnimalVacinas { get; set; }
    public DbSet<AnimalSaudeRegistro> AnimalSaudeRegistros { get; set; }
    public DbSet<AnimalReproducao> AnimalReproducoes { get; set; }
    public DbSet<Alerta> Alertas { get; set; }
    public DbSet<Despesa> Despesas { get; set; }
    public DbSet<Receita> Receitas { get; set; }
    public DbSet<Afastamento> Afastamentos { get; set; }
    public DbSet<EstoqueMedicamento> EstoqueMedicamentos { get; set; }
    public DbSet<EstoqueMovimentacao> EstoqueMovimentacoes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Propriedade>(e =>
        {
            e.ToTable("PROPRIEDADE");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.Nome).HasColumnName("nome").HasMaxLength(100).IsRequired();
            e.Property(p => p.Cidade).HasColumnName("cidade").HasMaxLength(100);
            e.Property(p => p.Estado).HasColumnName("estado").HasMaxLength(2);
            e.Property(p => p.FocoProdutivo).HasColumnName("foco_produtivo").HasMaxLength(20).HasDefaultValue("ambos");
        });

        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("USUARIO");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id");
            e.Property(u => u.Nome).HasColumnName("nome").HasMaxLength(100);
            e.Property(u => u.Email).HasColumnName("email").HasMaxLength(150);
            e.Property(u => u.NomeUsuario).HasColumnName("usuario").HasMaxLength(50).IsRequired();
            e.Property(u => u.Senha).HasColumnName("senha").HasMaxLength(255).IsRequired();
            e.Property(u => u.PropriedadeId).HasColumnName("propriedade_id");

            e.HasOne(u => u.Propriedade)
             .WithMany(p => p.Usuarios)
             .HasForeignKey(u => u.PropriedadeId);
        });

        modelBuilder.Entity<PropriedadeArea>(e =>
        {
            e.ToTable("PROPRIEDADE_AREA");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(a => a.TipoCadastro).HasColumnName("tipo_cadastro").HasMaxLength(20).HasDefaultValue("AREA_INTERNA").IsRequired();
            e.Property(a => a.AreaPaiId).HasColumnName("area_pai_id");
            e.Property(a => a.Nome).HasColumnName("nome").HasMaxLength(100).IsRequired();
            e.Property(a => a.TipoArea).HasColumnName("tipo_area").HasMaxLength(50).IsRequired();
            e.Property(a => a.Cor).HasColumnName("cor").HasMaxLength(7);
            e.Property(a => a.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(a => a.CoordenadasGeojson).HasColumnName("coordenadas_geojson").HasColumnType("nvarchar(max)").IsRequired();
            e.Property(a => a.AreaHectares).HasColumnName("area_hectares").HasColumnType("decimal(12,4)");
            e.Property(a => a.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(a => a.Propriedade)
             .WithMany(p => p.Areas)
             .HasForeignKey(a => a.PropriedadeId);

            e.HasOne(a => a.AreaPai)
             .WithMany(a => a.AreasInternas)
             .HasForeignKey(a => a.AreaPaiId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PropriedadePonto>(e =>
        {
            e.ToTable("PROPRIEDADE_PONTO");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(p => p.Tipo).HasColumnName("tipo").HasMaxLength(20).IsRequired();
            e.Property(p => p.Nome).HasColumnName("nome").HasMaxLength(100).IsRequired();
            e.Property(p => p.Latitude).HasColumnName("latitude").HasColumnType("decimal(10,7)");
            e.Property(p => p.Longitude).HasColumnName("longitude").HasColumnType("decimal(10,7)");
            e.Property(p => p.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(p => p.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(p => p.Propriedade)
             .WithMany(p => p.Pontos)
             .HasForeignKey(p => p.PropriedadeId);
        });

        modelBuilder.Entity<Animal>(e =>
        {
            e.ToTable("ANIMAL");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.Brinco).HasColumnName("brinco").HasMaxLength(20).IsRequired();
            e.Property(a => a.Nome).HasColumnName("nome").HasMaxLength(100);
            e.Property(a => a.Raca).HasColumnName("raca").HasMaxLength(50).IsRequired();
            e.Property(a => a.Raca2).HasColumnName("raca2").HasMaxLength(50);
            e.Property(a => a.Sexo).HasColumnName("sexo").HasMaxLength(1).IsRequired();
            e.Property(a => a.Tipo).HasColumnName("tipo").HasMaxLength(50).IsRequired();
            e.Property(a => a.StatusLeite).HasColumnName("status_leite").HasMaxLength(30);
            e.Property(a => a.Ativo).HasColumnName("ativo");
            e.Property(a => a.NumeroAnimal).HasColumnName("numero_animal").HasMaxLength(30);
            e.Property(a => a.DataNascimento).HasColumnName("data_nascimento");
            e.Property(a => a.DataNascimentoInformada).HasColumnName("data_nascimento_informada").HasMaxLength(10);
            e.Property(a => a.PaiAnimalId).HasColumnName("pai_animal_id");
            e.Property(a => a.NomePai).HasColumnName("nome_pai").HasMaxLength(100);
            e.Property(a => a.RacaPai).HasColumnName("raca_pai").HasMaxLength(50);
            e.Property(a => a.MaeAnimalId).HasColumnName("mae_animal_id");
            e.Property(a => a.NomeMae).HasColumnName("nome_mae").HasMaxLength(100);
            e.Property(a => a.RacaMae).HasColumnName("raca_mae").HasMaxLength(50);
            e.Property(a => a.Procedencia).HasColumnName("procedencia").HasMaxLength(120);
            e.Property(a => a.DataEntrada).HasColumnName("data_entrada");
            e.Property(a => a.DataEntradaInformada).HasColumnName("data_entrada_informada").HasMaxLength(10);
            e.Property(a => a.DataSaida).HasColumnName("data_saida");
            e.Property(a => a.DataSaidaInformada).HasColumnName("data_saida_informada").HasMaxLength(10);
            e.Property(a => a.Valor).HasColumnName("valor").HasColumnType("decimal(10,2)");
            e.Property(a => a.MotivoSaida).HasColumnName("motivo_saida").HasMaxLength(120);
            e.Property(a => a.MarcaSinal).HasColumnName("marca_sinal").HasMaxLength(120);
            e.Property(a => a.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(a => a.PropriedadeId).HasColumnName("propriedade_id");

            e.HasOne(a => a.Propriedade)
             .WithMany()
             .HasForeignKey(a => a.PropriedadeId);

            e.HasOne(a => a.PaiAnimal)
             .WithMany()
             .HasForeignKey(a => a.PaiAnimalId)
             .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(a => a.MaeAnimal)
             .WithMany()
             .HasForeignKey(a => a.MaeAnimalId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<AnimalFoto>(e =>
        {
            e.ToTable("ANIMAL_FOTO", t => t.HasCheckConstraint("CK_ANIMAL_FOTO_ORDEM", "ordem BETWEEN 1 AND 3"));
            e.HasKey(f => f.Id);
            e.Property(f => f.Id).HasColumnName("id");
            e.Property(f => f.AnimalId).HasColumnName("animal_id");
            e.Property(f => f.FotoBase64).HasColumnName("foto_base64").HasColumnType("nvarchar(max)").IsRequired();
            e.Property(f => f.Ordem).HasColumnName("ordem").IsRequired();
            e.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasIndex(f => new { f.AnimalId, f.Ordem }).IsUnique();

            e.HasOne(f => f.Animal)
             .WithMany(a => a.Fotos)
             .HasForeignKey(f => f.AnimalId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AnimalEvento>(e =>
        {
            e.ToTable("ANIMAL_EVENTO");
            e.HasKey(ev => ev.Id);
            e.Property(ev => ev.Id).HasColumnName("id");
            e.Property(ev => ev.AnimalId).HasColumnName("animal_id");
            e.Property(ev => ev.TipoEvento).HasColumnName("tipo_evento").HasMaxLength(50).IsRequired();
            e.Property(ev => ev.DataEvento).HasColumnName("data_evento");
            e.Property(ev => ev.PesoKg).HasColumnName("peso_kg").HasColumnType("decimal(10,2)");
            e.Property(ev => ev.RacaoKgDia).HasColumnName("racao_kg_dia").HasColumnType("decimal(10,2)");
            e.Property(ev => ev.LeiteLitrosDia).HasColumnName("leite_litros_dia").HasColumnType("decimal(10,2)");
            e.Property(ev => ev.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(ev => ev.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(ev => ev.Animal)
             .WithMany(a => a.Eventos)
             .HasForeignKey(ev => ev.AnimalId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AnimalLactacao>(e =>
        {
            e.ToTable("ANIMAL_LACTACAO");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.AnimalId).HasColumnName("animal_id");
            e.Property(l => l.NumeroLactacao).HasColumnName("numero_lactacao");
            e.Property(l => l.DataParto).HasColumnName("data_parto");
            e.Property(l => l.InicioControle).HasColumnName("inicio_controle");
            e.Property(l => l.DataSecagem).HasColumnName("data_secagem");
            e.Property(l => l.DiasLactacao).HasColumnName("dias_lactacao");
            e.Property(l => l.ProducaoTotal).HasColumnName("producao_total").HasColumnType("decimal(10,2)");
            e.Property(l => l.MediaDiaria).HasColumnName("media_diaria").HasColumnType("decimal(10,2)");
            e.Property(l => l.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(l => l.Animal)
             .WithMany(a => a.Lactacoes)
             .HasForeignKey(l => l.AnimalId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AnimalVacina>(e =>
        {
            e.ToTable("ANIMAL_VACINA");
            e.HasKey(v => v.Id);
            e.Property(v => v.Id).HasColumnName("id");
            e.Property(v => v.AnimalId).HasColumnName("animal_id");
            e.Property(v => v.NomeVacina).HasColumnName("nome_vacina").HasMaxLength(100).IsRequired();
            e.Property(v => v.DataAplicacao).HasColumnName("data_aplicacao");
            e.Property(v => v.Dose).HasColumnName("dose").HasMaxLength(50);
            e.Property(v => v.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(v => v.ProximaAplicacao).HasColumnName("proxima_aplicacao");
            e.Property(v => v.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(v => v.Animal)
             .WithMany(a => a.Vacinas)
             .HasForeignKey(v => v.AnimalId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AnimalSaudeRegistro>(e =>
        {
            e.ToTable("ANIMAL_SAUDE_REGISTRO");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id");
            e.Property(r => r.AnimalId).HasColumnName("animal_id");
            e.Property(r => r.TipoRegistro).HasColumnName("tipo_registro").HasMaxLength(50).IsRequired();
            e.Property(r => r.DataRegistro).HasColumnName("data_registro");
            e.Property(r => r.Descricao).HasColumnName("descricao").HasMaxLength(255);
            e.Property(r => r.ProdutoUtilizado).HasColumnName("produto_utilizado").HasMaxLength(100);
            e.Property(r => r.Dose).HasColumnName("dose").HasMaxLength(50);
            e.Property(r => r.Veterinario).HasColumnName("veterinario").HasMaxLength(100);
            e.Property(r => r.ProximaAplicacao).HasColumnName("proxima_aplicacao");
            e.Property(r => r.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(r => r.Animal)
             .WithMany(a => a.SaudeRegistros)
             .HasForeignKey(r => r.AnimalId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AnimalReproducao>(e =>
        {
            e.ToTable("ANIMAL_REPRODUCAO");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id");
            e.Property(r => r.AnimalId).HasColumnName("animal_id");
            e.Property(r => r.TipoEvento).HasColumnName("tipo_evento").HasMaxLength(50).IsRequired();
            e.Property(r => r.DataEvento).HasColumnName("data_evento");
            e.Property(r => r.Reprodutor).HasColumnName("reprodutor").HasMaxLength(100);
            e.Property(r => r.Inseminador).HasColumnName("inseminador").HasMaxLength(100);
            e.Property(r => r.PrevisaoParto).HasColumnName("previsao_parto");
            e.Property(r => r.Resultado).HasColumnName("resultado").HasMaxLength(100);
            e.Property(r => r.Observacao).HasColumnName("observacao").HasMaxLength(500);
            e.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(r => r.Animal)
             .WithMany(a => a.Reproducoes)
             .HasForeignKey(r => r.AnimalId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Alerta>(e =>
        {
            e.ToTable("ALERTA");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(a => a.AnimalId).HasColumnName("animal_id");
            e.Property(a => a.Tipo).HasColumnName("tipo").HasMaxLength(50).IsRequired();
            e.Property(a => a.Descricao).HasColumnName("descricao").HasMaxLength(255).IsRequired();
            e.Property(a => a.DataAlerta).HasColumnName("data_alerta");
            e.Property(a => a.Lido).HasColumnName("lido");
            e.Property(a => a.CreatedAt).HasColumnName("created_at");

            e.HasOne(a => a.Propriedade).WithMany().HasForeignKey(a => a.PropriedadeId);
            e.HasOne(a => a.Animal).WithMany().HasForeignKey(a => a.AnimalId);
        });

        modelBuilder.Entity<Despesa>(e =>
        {
            e.ToTable("DESPESA");
            e.HasKey(d => d.Id);
            e.Property(d => d.Id).HasColumnName("id");
            e.Property(d => d.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(d => d.AnimalId).HasColumnName("animal_id");
            e.Property(d => d.Categoria).HasColumnName("categoria").HasMaxLength(50).IsRequired();
            e.Property(d => d.Descricao).HasColumnName("descricao").HasMaxLength(255);
            e.Property(d => d.Valor).HasColumnName("valor").HasColumnType("decimal(10,2)");
            e.Property(d => d.DataDespesa).HasColumnName("data_despesa");
            e.Property(d => d.CreatedAt).HasColumnName("created_at");

            e.HasOne(d => d.Propriedade).WithMany().HasForeignKey(d => d.PropriedadeId);
            e.HasOne(d => d.Animal).WithMany().HasForeignKey(d => d.AnimalId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Receita>(e =>
        {
            e.ToTable("RECEITA");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id");
            e.Property(r => r.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(r => r.Tipo).HasColumnName("tipo").HasMaxLength(50).HasDefaultValue("Outros");
            e.Property(r => r.Descricao).HasColumnName("descricao").HasMaxLength(255);
            e.Property(r => r.Valor).HasColumnName("valor").HasColumnType("decimal(10,2)");
            e.Property(r => r.DataReceita).HasColumnName("data_receita");
            e.Property(r => r.CreatedAt).HasColumnName("created_at");

            e.HasOne(r => r.Propriedade).WithMany().HasForeignKey(r => r.PropriedadeId);
        });

        modelBuilder.Entity<Afastamento>(e =>
        {
            e.ToTable("AFASTAMENTO");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.AnimalId).HasColumnName("animal_id");
            e.Property(a => a.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(a => a.MotivoAfastamento).HasColumnName("motivo_afastamento").HasMaxLength(100).IsRequired();
            e.Property(a => a.DataAfastamento).HasColumnName("data_afastamento");
            e.Property(a => a.ProdutoUtilizado).HasColumnName("produto_utilizado").HasMaxLength(100);
            e.Property(a => a.PeriodoCarencia).HasColumnName("periodo_carencia");
            e.Property(a => a.DataRetorno).HasColumnName("data_retorno");
            e.Property(a => a.Observacao).HasColumnName("observacao").HasMaxLength(255);
            e.Property(a => a.CreatedAt).HasColumnName("created_at");

            e.HasOne(a => a.Animal).WithMany().HasForeignKey(a => a.AnimalId);
            e.HasOne(a => a.Propriedade).WithMany().HasForeignKey(a => a.PropriedadeId);
        });

        modelBuilder.Entity<EstoqueMedicamento>(e =>
        {
            e.ToTable("ESTOQUE_MEDICAMENTO");
            e.HasKey(em => em.Id);
            e.Property(em => em.Id).HasColumnName("id");
            e.Property(em => em.PropriedadeId).HasColumnName("propriedade_id");
            e.Property(em => em.Nome).HasColumnName("nome").HasMaxLength(100).IsRequired();
            e.Property(em => em.Tipo).HasColumnName("tipo").HasMaxLength(20).IsRequired();
            e.Property(em => em.Unidade).HasColumnName("unidade").HasMaxLength(20).IsRequired();
            e.Property(em => em.QuantidadeAtual).HasColumnName("quantidade_atual").HasColumnType("decimal(10,2)");
            e.Property(em => em.QuantidadeMinima).HasColumnName("quantidade_minima").HasColumnType("decimal(10,2)");
            e.Property(em => em.ValorUnitario).HasColumnName("valor_unitario").HasColumnType("decimal(10,2)");
            e.Property(em => em.Observacao).HasColumnName("observacao").HasMaxLength(255);
            e.Property(em => em.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");
            e.Property(em => em.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(em => em.Propriedade).WithMany().HasForeignKey(em => em.PropriedadeId);
        });

        modelBuilder.Entity<EstoqueMovimentacao>(e =>
        {
            e.ToTable("ESTOQUE_MOVIMENTACAO");
            e.HasKey(em => em.Id);
            e.Property(em => em.Id).HasColumnName("id");
            e.Property(em => em.EstoqueId).HasColumnName("estoque_id");
            e.Property(em => em.TipoMovimentacao).HasColumnName("tipo_movimentacao").HasMaxLength(10).IsRequired();
            e.Property(em => em.Quantidade).HasColumnName("quantidade").HasColumnType("decimal(10,2)").IsRequired();
            e.Property(em => em.Motivo).HasColumnName("motivo").HasMaxLength(100);
            e.Property(em => em.AnimalId).HasColumnName("animal_id");
            e.Property(em => em.DataMovimentacao).HasColumnName("data_movimentacao");
            e.Property(em => em.Observacao).HasColumnName("observacao").HasMaxLength(255);
            e.Property(em => em.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("GETDATE()");

            e.HasOne(em => em.Estoque)
             .WithMany(est => est.Movimentacoes)
             .HasForeignKey(em => em.EstoqueId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(em => em.Animal)
             .WithMany()
             .HasForeignKey(em => em.AnimalId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });
    }
}

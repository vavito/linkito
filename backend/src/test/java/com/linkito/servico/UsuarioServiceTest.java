package com.linkito.servico;

import com.linkito.usuario.Usuario;
import com.linkito.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class UsuarioServiceTest {

    @Test
    void cadastrarDeveCriptografarSenhaESalvar() {
        UsuarioRepository repository = Mockito.mock(UsuarioRepository.class);
        Mockito.when(repository.save(Mockito.any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        UsuarioService service = new UsuarioService(repository, new BCryptPasswordEncoder());
        Usuario usuario = service.cadastrar("Alice", "a@a.com", "secret");

        assertNotNull(usuario.getSenhaHash());
        assertNotEquals("secret", usuario.getSenhaHash());
    }

    @Test
    void buscarPorEmailDeveChamarRepositorio() {
        UsuarioRepository repository = Mockito.mock(UsuarioRepository.class);
        Mockito.when(repository.buscarPorEmail("x@x.com")).thenReturn(Optional.empty());

        UsuarioService service = new UsuarioService(repository, new BCryptPasswordEncoder());

        assertTrue(service.buscarPorEmail("x@x.com").isEmpty());
    }

    @Test
    void atualizarPerfilDeveAlterarNomeEmailESalvar() {
        UsuarioRepository repository = Mockito.mock(UsuarioRepository.class);
        Usuario usuario = new Usuario();
        UUID id = usuario.getId();
        usuario.setNome("Alice");
        usuario.setEmail("alice@example.com");

        Mockito.when(repository.findById(id)).thenReturn(Optional.of(usuario));
        Mockito.when(repository.save(Mockito.any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        UsuarioService service = new UsuarioService(repository, new BCryptPasswordEncoder());
        Usuario atualizado = service.atualizarPerfil(id, "Alice Nova", "alice.nova@example.com").orElseThrow();

        assertEquals("Alice Nova", atualizado.getNome());
        assertEquals("alice.nova@example.com", atualizado.getEmail());
        Mockito.verify(repository).save(usuario);
    }

    @Test
    void alterarSenhaDeveCriptografarNovaSenhaESalvar() {
        UsuarioRepository repository = Mockito.mock(UsuarioRepository.class);
        Mockito.when(repository.save(Mockito.any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        Usuario usuario = new Usuario();
        UsuarioService service = new UsuarioService(repository, new BCryptPasswordEncoder());
        Usuario atualizado = service.alterarSenha(usuario, "nova-senha");

        assertNotNull(atualizado.getSenhaHash());
        assertNotEquals("nova-senha", atualizado.getSenhaHash());
        Mockito.verify(repository).save(usuario);
    }
}

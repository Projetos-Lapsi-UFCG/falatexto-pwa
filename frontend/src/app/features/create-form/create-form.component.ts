import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronRight, lucidePencilLine, lucideSparkles } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { scaleIn, fadeIn } from '../../shared/animations/fade.animation';

/** Tela de escolha do modo de criação: com o Assis (IA) em /create/assis ou
 *  manual em /create/manually. */
@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [RouterLink, MatButtonModule, NgIcon, TranslateModule],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronRight, lucidePencilLine, lucideSparkles })],
  templateUrl: './create-form.component.html',
  styleUrl: './create-form.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateFormComponent {
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

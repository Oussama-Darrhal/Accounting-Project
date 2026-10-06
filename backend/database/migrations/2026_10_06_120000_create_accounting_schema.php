<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('ice')->nullable();
            $table->string('fiscal_id')->nullable();
            $table->date('fiscal_start');
            $table->date('fiscal_end');
            $table->unsignedTinyInteger('default_tva_rate')->default(20);
            $table->char('currency', 3)->default('MAD');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::create('pcm_classes', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('code')->unique();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 8);
            $table->string('name');
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pcm_class_id')->constrained('pcm_classes')->restrictOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->timestamps();
            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'parent_id']);
        });

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('journal_id')->constrained()->restrictOnDelete();
            $table->date('date_piece');
            $table->string('reference_piece')->nullable();
            $table->boolean('is_draft')->default(true);
            $table->decimal('debit_total', 15, 2)->default('0.00');
            $table->decimal('credit_total', 15, 2)->default('0.00');
            $table->timestamps();
            $table->index(['company_id', 'is_draft']);
            $table->index(['company_id', 'date_piece']);
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('journal_entry_id')->constrained('journal_entries')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained()->restrictOnDelete();
            $table->string('libelle');
            $table->decimal('debit', 15, 2)->default('0.00');
            $table->decimal('credit', 15, 2)->default('0.00');
            $table->unsignedTinyInteger('tva_rate')->nullable();
            $table->decimal('base_ht', 15, 2)->nullable();
            $table->decimal('montant_tva', 15, 2)->nullable();
            $table->date('due_date')->nullable();
            $table->string('lettrage_code', 8)->nullable();
            $table->timestamp('lettered_at')->nullable();
            $table->timestamps();
            $table->index(['account_id', 'lettrage_code']);
            $table->index('due_date');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_non_negative CHECK (debit >= 0 AND credit >= 0)');
            DB::statement('ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_single_side CHECK (NOT (debit > 0 AND credit > 0))');
            DB::statement('ALTER TABLE pcm_classes ADD CONSTRAINT pcm_classes_code_range CHECK (code BETWEEN 1 AND 8)');
            DB::statement("ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_tva_rate CHECK (tva_rate IS NULL OR tva_rate IN (0, 7, 10, 14, 20))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('journals');
        Schema::dropIfExists('pcm_classes');
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });
        Schema::dropIfExists('companies');
    }
};

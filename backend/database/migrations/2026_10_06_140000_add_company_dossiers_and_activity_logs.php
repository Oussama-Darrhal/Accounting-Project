<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('slug', 64)->nullable()->after('name');
            $table->string('umbrella', 128)->default('Groupe')->after('slug');
        });

        $used = [];
        foreach (DB::table('companies')->orderBy('id')->get() as $company) {
            $slug = Str::slug($company->name) ?: 'societe-'.$company->id;
            if (isset($used[$slug])) {
                $slug .= '-'.$company->id;
            }
            $used[$slug] = true;
            DB::table('companies')->where('id', $company->id)->update([
                'slug' => $slug,
                'umbrella' => $company->umbrella ?: 'Groupe',
            ]);
        }

        Schema::table('companies', function (Blueprint $table) {
            $table->unique('slug');
        });

        Schema::create('company_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['company_id', 'user_id']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('actor', 128)->nullable();
            $table->string('action', 64);
            $table->string('message', 512);
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('company_user');
        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'umbrella']);
        });
    }
};

-- Rename tables to Indonesian
ALTER TABLE campaigns RENAME TO kampanye;
ALTER TABLE content_types RENAME TO jenis_konten;
ALTER TABLE platforms RENAME TO platform;
ALTER TABLE projects RENAME TO proyek;
ALTER TABLE datasets RENAME TO dataset;
ALTER TABLE posts RENAME TO postingan;
ALTER TABLE saved_filters RENAME TO filter_tersimpan;
ALTER TABLE kpi_targets RENAME TO target_kpi;
ALTER TABLE imports_log RENAME TO log_impor;
ALTER TABLE notes RENAME TO catatan;
ALTER TABLE profiles RENAME TO profil;
ALTER TABLE project_members RENAME TO anggota_proyek;

-- Rename columns in kampanye
ALTER TABLE kampanye RENAME COLUMN project_id TO id_proyek;
ALTER TABLE kampanye RENAME COLUMN name TO nama_kampanye;
ALTER TABLE kampanye RENAME COLUMN start_date TO tanggal_mulai_kampanye;
ALTER TABLE kampanye RENAME COLUMN end_date TO tanggal_selesai_kampanye;
ALTER TABLE kampanye RENAME COLUMN notes TO catatan_kampanye;

-- Rename columns in jenis_konten
ALTER TABLE jenis_konten RENAME COLUMN name TO kode_jenis_konten;
ALTER TABLE jenis_konten RENAME COLUMN display_name TO nama_jenis_konten;
ALTER TABLE jenis_konten RENAME COLUMN is_active TO jenis_konten_aktif;

-- Rename columns in platform
ALTER TABLE platform RENAME COLUMN name TO kode_platform;
ALTER TABLE platform RENAME COLUMN display_name TO nama_platform;
ALTER TABLE platform RENAME COLUMN color TO warna_platform;
ALTER TABLE platform RENAME COLUMN is_active TO platform_aktif;

-- Rename columns in proyek
ALTER TABLE proyek RENAME COLUMN user_id TO id_pemilik;
ALTER TABLE proyek RENAME COLUMN name TO nama_proyek;
ALTER TABLE proyek RENAME COLUMN description TO deskripsi_proyek;

-- Rename columns in dataset
ALTER TABLE dataset RENAME COLUMN project_id TO id_proyek;
ALTER TABLE dataset RENAME COLUMN name TO nama_dataset;
ALTER TABLE dataset RENAME COLUMN source_type TO jenis_sumber_dataset;
ALTER TABLE dataset RENAME COLUMN storage_path TO lokasi_berkas_dataset;
ALTER TABLE dataset RENAME COLUMN row_count TO jumlah_baris_dataset;
ALTER TABLE dataset RENAME COLUMN is_active TO dataset_aktif;

-- Rename columns in postingan
ALTER TABLE postingan RENAME COLUMN project_id TO id_proyek;
ALTER TABLE postingan RENAME COLUMN dataset_id TO id_dataset;
ALTER TABLE postingan RENAME COLUMN platform_id TO id_platform;
ALTER TABLE postingan RENAME COLUMN content_type_id TO id_jenis_konten;
ALTER TABLE postingan RENAME COLUMN campaign_id TO id_kampanye;
ALTER TABLE postingan RENAME COLUMN post_id TO kode_postingan;
ALTER TABLE postingan RENAME COLUMN posted_at TO waktu_diposting;
ALTER TABLE postingan RENAME COLUMN caption TO teks_caption;
ALTER TABLE postingan RENAME COLUMN likes TO jumlah_likes;
ALTER TABLE postingan RENAME COLUMN comments TO jumlah_komentar;
ALTER TABLE postingan RENAME COLUMN shares TO jumlah_shares;
ALTER TABLE postingan RENAME COLUMN saved TO jumlah_saved;
ALTER TABLE postingan RENAME COLUMN views TO jumlah_views;
ALTER TABLE postingan RENAME COLUMN reach TO jumlah_reach;
ALTER TABLE postingan RENAME COLUMN followers TO jumlah_followers;
ALTER TABLE postingan RENAME COLUMN engagement TO total_engagement;
ALTER TABLE postingan RENAME COLUMN engagement_rate TO engagement_rate_persen;

-- Rename columns in filter_tersimpan
ALTER TABLE filter_tersimpan RENAME COLUMN user_id TO id_pengguna;
ALTER TABLE filter_tersimpan RENAME COLUMN project_id TO id_proyek;
ALTER TABLE filter_tersimpan RENAME COLUMN name TO nama_filter;
ALTER TABLE filter_tersimpan RENAME COLUMN page TO halaman;
ALTER TABLE filter_tersimpan RENAME COLUMN filter_json TO nilai_filter_json;

-- Rename columns in target_kpi
ALTER TABLE target_kpi RENAME COLUMN project_id TO id_proyek;
ALTER TABLE target_kpi RENAME COLUMN period_type TO jenis_periode;
ALTER TABLE target_kpi RENAME COLUMN period_start TO tanggal_mulai_periode;
ALTER TABLE target_kpi RENAME COLUMN period_end TO tanggal_selesai_periode;
ALTER TABLE target_kpi RENAME COLUMN target_avg_er TO target_rata_rata_er;
ALTER TABLE target_kpi RENAME COLUMN target_followers TO target_jumlah_followers;
ALTER TABLE target_kpi RENAME COLUMN target_total_reach TO target_total_jangkauan;

-- Rename columns in log_impor
ALTER TABLE log_impor RENAME COLUMN dataset_id TO id_dataset;
ALTER TABLE log_impor RENAME COLUMN status TO status_impor;
ALTER TABLE log_impor RENAME COLUMN message TO pesan;
ALTER TABLE log_impor RENAME COLUMN missing_columns TO kolom_hilang;
ALTER TABLE log_impor RENAME COLUMN invalid_rows_count TO jumlah_baris_tidak_valid;

-- Rename columns in catatan
ALTER TABLE catatan RENAME COLUMN user_id TO id_pengguna;
ALTER TABLE catatan RENAME COLUMN project_id TO id_proyek;
ALTER TABLE catatan RENAME COLUMN dataset_id TO id_dataset;
ALTER TABLE catatan RENAME COLUMN content TO isi_catatan;
ALTER TABLE catatan RENAME COLUMN scope_type TO jenis_scope;
ALTER TABLE catatan RENAME COLUMN scope_key TO kunci_scope;

-- Rename columns in profil
ALTER TABLE profil RENAME COLUMN full_name TO nama_lengkap;
ALTER TABLE profil RENAME COLUMN role TO peran;

-- Rename columns in anggota_proyek
ALTER TABLE anggota_proyek RENAME COLUMN user_id TO id_pengguna;
ALTER TABLE anggota_proyek RENAME COLUMN project_id TO id_proyek;
ALTER TABLE anggota_proyek RENAME COLUMN role_in_project TO peran_dalam_proyek;
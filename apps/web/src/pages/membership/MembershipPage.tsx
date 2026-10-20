import { Card, CardBody, CardHeader } from '../../components/ui/Card';

export function MembershipPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auto Join & Membership Sync</h1>
        <p className="text-xs text-muted">
          Antrean join otomatis dari hasil Discovery, plus sinkronisasi berkala apakah akun masih member.
        </p>
      </div>
      <Card>
        <CardHeader title="Antrean Join" />
        <CardBody className="text-sm text-muted">
          Join dieksekusi oleh worker <code>telegram:join</code> dengan honor flood-wait dan rate-limit per akun (lihat .claude/rules/telegram.md).
          <br />
          Status: akan diisi saat worker memproses discovered_links.
        </CardBody>
      </Card>
    </div>
  );
}

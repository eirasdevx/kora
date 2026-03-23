import { NextRequest, NextResponse } from "next/server";
import type { AssociationDataMutationMode } from "@/lib/association-data";
import {
  isAssociationDataModule,
  type AssociationDataModule,
} from "@/lib/association-data";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  saveAssociationModuleRecords,
  upsertAssociationModuleRecord,
} from "@/lib/server/association-data-service";

type RouteContext = {
  params: Promise<{
    module: string;
  }>;
};

type AssociationDataMutationPayload = {
  mode?: AssociationDataMutationMode;
  record?: unknown;
  records?: unknown[];
};

const resolveModule = async (
  context: RouteContext
): Promise<AssociationDataModule | null> => {
  const { module } = await context.params;
  return isAssociationDataModule(module) ? module : null;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const dataModule = await resolveModule(context);

  if (!dataModule) {
    return NextResponse.json(
      { error: "Modulo de datos no valido." },
      { status: 404 }
    );
  }

  try {
    const records = await listAssociationModuleRecords(dataModule);
    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ?
          (error instanceof Error
            ? error.message
            : "No se pudieron recuperar los registros."),
      },
      { status: publicDatabaseError?.status ? 400 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const dataModule = await resolveModule(context);

  if (!dataModule) {
    return NextResponse.json(
      { error: "Modulo de datos no valido." },
      { status: 404 }
    );
  }

  let payload: AssociationDataMutationPayload;

  try {
    payload = (await request.json()) as AssociationDataMutationPayload;
  } catch {
    return NextResponse.json({ error: "Solicitud inv?lida." }, { status: 400 });
  }

  try {
    if (Array.isArray(payload.records)) {
      const records = await saveAssociationModuleRecords(
        dataModule,
        payload.records,
        payload.mode
      );
      return NextResponse.json({ records });
    }

    if (payload.record !== undefined) {
      const record = await upsertAssociationModuleRecord(
        dataModule,
        payload.record
      );
      return NextResponse.json(record);
    }

    return NextResponse.json(
      { error: "No se recibieron registros para guardar." },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ?
          (error instanceof Error
            ? error.message
            : "No se pudieron guardar los registros."),
      },
      { status: publicDatabaseError?.status ? 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const dataModule = await resolveModule(context);

  if (!dataModule) {
    return NextResponse.json(
      { error: "Modulo de datos no valido." },
      { status: 404 }
    );
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "El id del registro es obligatorio." },
      { status: 400 }
    );
  }

  try {
    await deleteAssociationModuleRecord(dataModule, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ?
          (error instanceof Error
            ? error.message
            : "No se pudo eliminar el registro."),
      },
      { status: publicDatabaseError?.status ? 400 }
    );
  }
}

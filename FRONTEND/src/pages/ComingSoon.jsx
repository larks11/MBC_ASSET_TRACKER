import PageHeader from "../components/ui/PageHeader.jsx";

export default function ComingSoon({ title, description }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-md border border-dashed border-line bg-white px-6 py-14 text-center text-sm text-slate-500">
        This page is built in the next batch. The backend for it is already running.
      </div>
    </>
  );
}
